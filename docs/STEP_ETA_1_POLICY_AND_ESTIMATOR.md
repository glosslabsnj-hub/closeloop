# ETA Engine Step 1: Policy + Baseline Estimator + Business Context Contract

## Overview

This document describes Step 1 of the Distance + ETA Engine implementation. This step establishes:

1. **Database schema** for ETA policy configuration
2. **Deterministic ETA estimator** using safe ranges (no maps provider)
3. **Business context contract** extending the canonical context with ETA fields
4. **HIPAA-safe logging** for ETA computation events

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ETA Flow (Step 1)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐  │
│  │ tenants      │───▶│ buildBusiness   │───▶│ AI Voice/SMS     │  │
│  │ eta_policy_  │    │ Context.ts      │    │ Prompts          │  │
│  │ jsonb        │    │                 │    │                  │  │
│  └──────────────┘    │ computeEta      │    │ "30 to 45 mins"  │  │
│                      │ ForContext()    │    └──────────────────┘  │
│                      └─────────────────┘                          │
│                                                                     │
│  ┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐  │
│  │ estimateEta  │    │ ai_event_logs   │    │ logAiEvent       │  │
│  │ .ts          │───▶│ stage:          │◀───│ HIPAA-safe       │  │
│  │ src/lib/eta  │    │ "eta_computed"  │    │ src/lib/logging  │  │
│  └──────────────┘    └─────────────────┘    └──────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Column: `tenants.eta_policy_jsonb`

Added via migration `20260202000004_add_eta_policy_jsonb.sql`:

```sql
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS eta_policy_jsonb JSONB DEFAULT '{
  "default_range_minutes": { "min": 30, "max": 60 },
  "busyness_buffer_pct": 15,
  "holiday_buffer_pct": 10
}'::jsonb;
```

### ETA Policy Schema

```typescript
interface EtaPolicy {
  // Default ETA range when no overrides match
  default_range_minutes: { min: number; max: number };

  // Override ranges by business_mode (service, dispatch, food, medical, general)
  mode_overrides?: {
    [mode: string]: {
      range_minutes: { min: number; max: number };
    };
  };

  // Override ranges by job_type (e.g., "battery_jump", "pizza_delivery")
  job_type_overrides?: {
    [jobType: string]: {
      range_minutes: { min: number; max: number };
    };
  };

  // Busyness buffer percentage 0-50, applied based on current busyness
  busyness_buffer_pct?: number;

  // Holiday buffer percentage 0-50, added when is_holiday is true
  holiday_buffer_pct?: number;
}
```

### Example Policies

**Service Business (Plumber):**
```json
{
  "default_range_minutes": { "min": 45, "max": 90 },
  "job_type_overrides": {
    "emergency_leak": { "range_minutes": { "min": 30, "max": 60 } },
    "drain_cleaning": { "range_minutes": { "min": 60, "max": 120 } }
  },
  "busyness_buffer_pct": 20,
  "holiday_buffer_pct": 15
}
```

**Dispatch Business (Roadside Assistance):**
```json
{
  "default_range_minutes": { "min": 20, "max": 45 },
  "job_type_overrides": {
    "battery_jump": { "range_minutes": { "min": 15, "max": 30 } },
    "tow": { "range_minutes": { "min": 30, "max": 60 } },
    "lockout": { "range_minutes": { "min": 20, "max": 40 } }
  },
  "busyness_buffer_pct": 15,
  "holiday_buffer_pct": 10
}
```

**Food Business (Restaurant):**
```json
{
  "default_range_minutes": { "min": 25, "max": 40 },
  "job_type_overrides": {
    "pizza_delivery": { "range_minutes": { "min": 20, "max": 35 } },
    "catering": { "range_minutes": { "min": 60, "max": 120 } }
  },
  "busyness_buffer_pct": 15
}
```

## Deterministic ETA Estimator

### Location: `src/lib/eta/estimateEta.ts`

### Algorithm (in order):

1. **Check job_type_overrides** if `job_type` is provided
2. **Check mode_overrides** for `business_mode`
3. **Fall back to default_range_minutes**
4. **Apply busyness buffer**: multiply range by `(1 + busyness_buffer_pct * busyness_pct / 10000)`
5. **Apply holiday buffer** if `is_holiday`: multiply by `(1 + holiday_buffer_pct / 100)`

### Example Calculation

Input:
- business_mode: "dispatch"
- job_type: "battery_jump" (override: 15-30 min)
- busyness_pct: 50%
- busyness_buffer_pct: 15%
- is_holiday: false

Calculation:
1. Base range from job_type override: 15-30 min
2. Busyness multiplier: 1 + (15 * 50 / 10000) = 1.075
3. Adjusted range: 16-32 min (rounded)
4. Spoken: "16 to 32 minutes"

### Usage

```typescript
import { estimateEta, EtaPolicy, EtaInput } from "@/lib/eta";

const policy: EtaPolicy = tenant.eta_policy_jsonb;
const input: EtaInput = {
  business_mode: "dispatch",
  job_type: "battery_jump",
  manual_busyness_pct: 50,
  is_holiday: false,
};

const result = estimateEta(policy, input);
// result = {
//   spoken: "16 to 32 minutes",
//   min: 16,
//   max: 32,
//   source: "job_type",
//   notes: ["Using job_type override...", "Applied busyness buffer..."]
// }
```

## Business Context Extension

### Location: `supabase/functions/_shared/buildBusinessContext.ts`

### New Interface Fields

```typescript
interface BusinessContext {
  // ... existing fields ...

  eta: {
    /** Pre-computed ETA for AI to speak ("30 to 45 minutes") */
    spoken: string;
    /** Minimum ETA in minutes */
    min_minutes: number;
    /** Maximum ETA in minutes */
    max_minutes: number;
    /** Source of the range: "job_type" | "mode" | "default" */
    source: string;
    /** Policy loaded from tenant */
    policy: EtaPolicyJson | null;
  };
}
```

### AI Prompt Integration

The `ctx.eta.spoken` field is ready for AI prompts:

```
When the customer asks about wait time or ETA, say: "Our current estimate is ${ctx.eta.spoken}."
```

## HIPAA-Safe Logging

### Location: `src/lib/logging/logAiEvent.ts`

### Features

- **No raw addresses stored** - only hashed addresses (8-char SHA-256 prefix)
- **City extraction** for correlation without exact location
- **Event type: "eta_computed"** logged to `ai_event_logs` table

### Usage

```typescript
import { logEtaComputed } from "@/lib/logging";

await logEtaComputed(
  { tenantId, sessionId, callSid },
  {
    spoken: "30 to 45 minutes",
    min_minutes: 30,
    max_minutes: 45,
    source: "mode",
    business_mode: "dispatch",
    pickup_address: "123 Main St, Denver, CO 80202", // Will be hashed
  }
);
```

### Stored Data Example

```json
{
  "stage": "eta_computed",
  "event_data": {
    "spoken": "30 to 45 minutes",
    "min_minutes": 30,
    "max_minutes": 45,
    "source": "mode",
    "business_mode": "dispatch",
    "pickup_address_hash": "a1b2c3d4"
  }
}
```

## Testing

### Simulator Script: `scripts/simulateEta.ts`

Run with:
```bash
npx tsx scripts/simulateEta.ts
```

Tests 4 scenarios:
1. Service mode, low busyness
2. Dispatch mode, high busyness
3. Food mode with job_type override
4. Dispatch on holiday

### Expected Output

```
======================================================================
ETA SIMULATOR TEST SUITE
======================================================================

📋 Scenario 1: Service mode, low busyness
   A plumber booking during a quiet Tuesday afternoon
------------------------------------------
Input: {"business_mode":"service","manual_busyness_pct":10}

Result:
   🗣️  Spoken: "46 to 92 minutes"
   ⏱️  Range: 46 - 92 minutes
   📍 Source: mode

   ✅ PASS: Source matches expected (mode)
   ✅ PASS: Range is reasonable
```

## Future Steps

- **Step 2**: Add maps provider integration (Google Distance Matrix)
- **Step 3**: Real-time traffic adjustments
- **Step 4**: Historical ETA accuracy tracking
- **Step 5**: Dynamic re-estimation during calls

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260202000004_add_eta_policy_jsonb.sql` | New migration |
| `src/lib/eta/estimateEta.ts` | New: ETA types and estimator |
| `src/lib/eta/index.ts` | New: Module exports |
| `supabase/functions/_shared/buildBusinessContext.ts` | Added eta section |
| `src/lib/logging/logAiEvent.ts` | New: HIPAA-safe event logger |
| `src/lib/logging/index.ts` | New: Module exports |
| `scripts/simulateEta.ts` | New: Test simulator |
| `docs/STEP_ETA_1_POLICY_AND_ESTIMATOR.md` | This documentation |

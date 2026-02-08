
# Plan: Wire Impound Agent Variables ✅ COMPLETED

## Status: IMPLEMENTED

All impound-specific context variables have been added to the system.

## Summary of Changes Made

### 1. Updated `BusinessContext` Interface (buildBusinessContext.ts)
Added the `impound` section with all required fields:
- Core: `lot_id`, `lot_name`, `lot_address`, `lot_phone`
- Hours: `lot_hours_today`, `lot_hours_summary`, `is_open_now`, `next_open`
- Fees: `base_tow_fee_cents`, `daily_storage_cents`, `admin_fee_cents`, `gate_fee_cents`, `fee_summary`
- Release: `release_requirements`, `release_requirements_summary`, `accepted_payment_methods`, `accepted_payment_summary`

```typescript
// Add to BusinessContext interface (around line 290)
impound: {
  lot_id: string;
  lot_name: string;
  lot_address: string;
  lot_phone: string;
  lot_hours_today: string;
  lot_hours_summary: string;
  is_open_now: boolean;
  next_open: string;
  // Fee structure from impound_settings
  base_tow_fee_cents: number;
  daily_storage_cents: number;
  admin_fee_cents: number;
  gate_fee_cents: number;
  fee_summary: string;
  // Release requirements
  release_requirements: string[];
  release_requirements_summary: string;
  accepted_payment_methods: string[];
  accepted_payment_summary: string;
} | null;
```

### 2. Fetch Impound Data (buildBusinessContext.ts)
Add parallel fetch for impound lot and settings when capability is enabled:

```typescript
// Add to parallel fetch block (around line 1507-1535)
// Fetch impound data only if capability enabled
const impoundLotPromise = capabilities.impound_lot
  ? supabase.from("impound_lots")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle()
  : Promise.resolve({ data: null, error: null });

const impoundSettingsPromise = capabilities.impound_lot
  ? supabase.from("impound_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle()
  : Promise.resolve({ data: null, error: null });
```

### 3. Build Impound Context Object (buildBusinessContext.ts)
Add helper function and populate the impound section:

```typescript
// Helper function to format impound hours for today
function getImpoundLotHoursToday(hoursJson: Record<string, any> | null): { 
  hours_today: string; 
  is_open: boolean; 
  next_open: string;
  hours_summary: string;
} {
  // Similar logic to getTodayHours but for impound lots
  // Returns formatted hours for voice AI
}

// Helper to build fee summary
function buildImpoundFeeSummary(settings: any): string {
  const parts: string[] = [];
  if (settings.base_tow_fee_cents) 
    parts.push(`$${(settings.base_tow_fee_cents / 100).toFixed(0)} base tow`);
  if (settings.daily_storage_cents)
    parts.push(`$${(settings.daily_storage_cents / 100).toFixed(0)} per day storage`);
  if (settings.admin_fee_cents)
    parts.push(`$${(settings.admin_fee_cents / 100).toFixed(0)} admin fee`);
  if (settings.gate_fee_cents)
    parts.push(`$${(settings.gate_fee_cents / 100).toFixed(0)} gate fee`);
  return parts.join(", ");
}

// Helper to format release requirements
function formatReleaseRequirements(reqs: string[]): string {
  const REQUIREMENT_LABELS: Record<string, string> = {
    valid_id: "valid government-issued ID",
    registration: "vehicle registration or title",
    insurance: "proof of insurance",
    lien_release: "lien release from lienholder",
    police_release: "police release authorization",
    payment: "payment in full",
  };
  return reqs.map(r => REQUIREMENT_LABELS[r] || r).join(", ");
}
```

### 4. Register Variables in voiceContextContract.ts
Add new impound-specific variables to the registry (after the dispatch-specific section, around line 1160):

```typescript
// ===== IMPOUND LOT VARIABLES =====
{
  key: "impound_lot_id",
  description: "Default impound lot UUID",
  type: "string",
  source: "impound.lot_id",
  defaultValue: "",
  category: "core",
},
{
  key: "impound_lot_name",
  description: "Impound lot name",
  type: "string",
  source: "impound.lot_name",
  defaultValue: "",
  category: "core",
},
{
  key: "impound_lot_address",
  description: "Full impound lot address",
  type: "string",
  source: "impound.lot_address",
  defaultValue: "",
  category: "core",
},
{
  key: "impound_lot_phone",
  description: "Impound lot phone number",
  type: "string",
  source: "impound.lot_phone",
  defaultValue: "",
  category: "core",
},
{
  key: "impound_lot_hours_today",
  description: "Today's hours for impound lot (e.g., '8 AM - 5 PM')",
  type: "string",
  source: "impound.lot_hours_today",
  defaultValue: "",
  category: "hours",
},
{
  key: "impound_lot_hours_summary",
  description: "Weekly hours summary for voice (e.g., 'Monday through Friday 8 to 5')",
  type: "string",
  source: "impound.lot_hours_summary",
  defaultValue: "",
  category: "hours",
},
{
  key: "impound_is_open_now",
  description: "Whether the impound lot is currently open",
  type: "boolean",
  source: "impound.is_open_now",
  defaultValue: false,
  category: "hours",
},
{
  key: "impound_next_open",
  description: "When the lot next opens (e.g., 'Tomorrow at 8 AM')",
  type: "string",
  source: "impound.next_open",
  defaultValue: "",
  category: "hours",
},
{
  key: "impound_base_tow_fee",
  description: "Base tow fee in dollars (e.g., '175')",
  type: "string",
  source: (ctx) => ctx.impound?.base_tow_fee_cents 
    ? String(ctx.impound.base_tow_fee_cents / 100) : "",
  defaultValue: "",
  category: "pricing",
},
{
  key: "impound_daily_storage_fee",
  description: "Daily storage fee in dollars (e.g., '35')",
  type: "string",
  source: (ctx) => ctx.impound?.daily_storage_cents 
    ? String(ctx.impound.daily_storage_cents / 100) : "",
  defaultValue: "",
  category: "pricing",
},
{
  key: "impound_admin_fee",
  description: "Admin fee in dollars",
  type: "string",
  source: (ctx) => ctx.impound?.admin_fee_cents 
    ? String(ctx.impound.admin_fee_cents / 100) : "",
  defaultValue: "",
  category: "pricing",
},
{
  key: "impound_gate_fee",
  description: "Gate fee in dollars",
  type: "string",
  source: (ctx) => ctx.impound?.gate_fee_cents 
    ? String(ctx.impound.gate_fee_cents / 100) : "",
  defaultValue: "",
  category: "pricing",
},
{
  key: "impound_fee_summary",
  description: "Speech-ready summary of all fees",
  type: "string",
  source: "impound.fee_summary",
  defaultValue: "",
  category: "pricing",
},
{
  key: "impound_release_requirements",
  description: "Comma-separated release requirements",
  type: "string",
  source: (ctx) => ctx.impound?.release_requirements?.join(", ") || "",
  defaultValue: "",
  category: "policies",
},
{
  key: "impound_release_requirements_summary",
  description: "Speech-ready release requirements",
  type: "string",
  source: "impound.release_requirements_summary",
  defaultValue: "",
  category: "policies",
},
{
  key: "impound_accepted_payment",
  description: "Accepted payment methods",
  type: "string",
  source: "impound.accepted_payment_summary",
  defaultValue: "",
  category: "policies",
},
```

### 5. Variable Mapping for ElevenLabs Prompt
The Impound Agent prompt will use these dynamic variables:

| Prompt Variable | Context Path | Description |
|-----------------|--------------|-------------|
| `{{tenant_id}}` | Already exists | For tool calls |
| `{{business_name}}` | Already exists | Business name |
| `{{impound_lot_id}}` | `impound.lot_id` | For tool calls |
| `{{impound_lot_address}}` | `impound.lot_address` | Full address |
| `{{impound_lot_hours_today}}` | `impound.lot_hours_today` | Today's hours |
| `{{impound_is_open_now}}` | `impound.is_open_now` | Open status |
| `{{impound_next_open}}` | `impound.next_open` | Next open time |
| `{{impound_base_tow_fee}}` | Computed | Base tow in dollars |
| `{{impound_daily_storage_fee}}` | Computed | Daily storage in dollars |
| `{{impound_admin_fee}}` | Computed | Admin fee in dollars |
| `{{impound_gate_fee}}` | Computed | Gate fee in dollars |
| `{{impound_fee_summary}}` | `impound.fee_summary` | All fees summary |
| `{{impound_release_requirements_summary}}` | `impound.release_requirements_summary` | What to bring |
| `{{impound_accepted_payment}}` | `impound.accepted_payment_summary` | Payment methods |

### 6. Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/buildBusinessContext.ts` | Add `impound` to interface, fetch impound data, populate section |
| `supabase/functions/_shared/voiceContextContract.ts` | Register 14 new impound variables |

### 7. Edge Functions to Redeploy
After changes:
- `get-business-context`
- `elevenlabs-init`
- `twilio-inbound`

## Validation
After implementation, calling `get-business-context` for a tenant with impound capability enabled should return:
- All `impound_*` dynamic variables populated
- Fee values converted from cents to dollars
- Hours formatted for speech
- Release requirements in natural language

## Notes
- Variables return empty strings when impound capability is disabled (safe fallback)
- Fee values are stored in cents but exposed as dollars for speech
- Hours use the same natural speech formatting as the main business hours

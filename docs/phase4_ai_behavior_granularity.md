# Phase 4: AI Behavior Granularity — Implementation Record

## Status: COMPLETE

## Changes Made

### 4A. Unified Booking Behavior Model (4 modes)
The AI now supports 4 distinct booking behaviors, replacing the old binary `full_service` / `callback_only`:

| Mode | AI Behavior | Booking Created? | Status |
|------|-------------|-----------------|--------|
| `auto_book` (full_service) | Check availability, book instantly, confirm | Yes | confirmed |
| `book_pending` (pending_approval) | Check availability, book, mark pending | Yes | pending |
| `suggest_callback` | Check availability, share times, create callback | No (callback) | — |
| `callback_only` | Capture info only, no availability check | No (callback) | — |

### 4B. Agent Prompt Updates
**File:** `supabase/functions/_shared/agentBasePrompts.ts`

- Added `SUGGEST_CALLBACK_OVERRIDE` prompt constant:
  - AI uses `suggest_availability` to check times
  - Shares available times with caller
  - Uses `create_callback` (NOT `create_booking`) with preferred time in notes
  - Frames as personal service: "Let me have the team confirm that for you"

- Added `BOOK_PENDING_OVERRIDE` prompt constant:
  - AI checks availability and creates bookings normally
  - Tells caller appointment is TENTATIVE ("penciled in")
  - Never says "confirmed" — says "you'll get a confirmation shortly"

- Added `GUARDRAILS_AND_ESCALATION` prompt section (injected for ALL modes):
  - Uses `{{ai_guardrails}}` dynamic variable
  - Uses `{{required_intake_fields_summary}}` for intake requirements
  - Uses `{{escalation_rules_summary}}` for transfer rules

- Updated `buildPromptForCapabilities()`:
  - Accepts 4 behavior modes: `full_service`, `callback_only`, `suggest_callback`, `book_pending`
  - Injects appropriate override prompt section

- Updated `getBasePromptForMode()`:
  - Same 4-mode signature
  - Injects `GUARDRAILS_AND_ESCALATION` into base prompt flow

### 4C. Behavior Resolution
**File:** `supabase/functions/_shared/buildBusinessContext.ts`

The prompt builder now resolves the effective behavior mode from two sources:
1. `ai_behavior_mode` (legacy: `full_service` or `callback_only`)
2. `ai_booking_mode` (new: `auto_book`, `pending_approval`, `suggest_callback`, `callback_only`)

Resolution logic:
```
if ai_behavior_mode is set and not "full_service" → use it
else check ai_booking_mode:
  - "pending_approval" / "pending" → "book_pending"
  - "suggest_callback" → "suggest_callback"
  - "callback_only" → "callback_only"
  - "auto_book" / "auto_confirm" → "full_service" (default)
```

### 4D. Dynamic Variables (from Phase 1 & 2)
Already implemented in earlier phases:
- `ai_guardrails` — free-text things AI should never promise
- `required_intake_fields_summary` — human-readable required info list
- `escalation_rules_summary` — speech-ready escalation rules
- `ai_booking_mode` — the raw booking mode value

### 4E. Frontend (from Phase 1)
Already implemented in onboarding:
- 4-option booking mode selector in `CommunicationPreferences.tsx`
- Escalation rules toggles (5 transfer triggers + fallback action)
- AI guardrails textarea
- Required intake fields per business mode

## Backward Compatibility
- Old `ai_behavior_mode: "full_service"` works as before (auto_book behavior)
- Old `ai_behavior_mode: "callback_only"` works as before
- Old `ai_booking_mode: "pending"` maps to `book_pending`
- New modes `suggest_callback` and `book_pending` are additive
- Default behavior (no explicit mode set) remains `full_service`

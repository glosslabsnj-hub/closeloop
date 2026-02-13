

# Fix Calendar Availability + Pending Booking Notification

## What's Wrong (Summary)

1. **Blue Boxer has NO `assistant_settings` row** -- so booking mode, calendar provider, and all settings are null
2. **`min_lead_hours` is 24** -- blocks all same-day/next-day bookings
3. **`fn_compute_available_slots` SQL function only reads flat `hours_json`** (e.g., `{"open": "08:00", "close": "16:30"}`) but Blue Boxer uses the newer **windows format** (`{"windows": [{"open": "08:00", "close": "16:30"}]}`) -- result: zero slots returned, AI says "fully booked"
4. **`elevenlabs-check-availability` edge function** has the same flat-format assumption on lines 316-317
5. **No prompt instruction** tells the AI to notify callers that bookings are "pending confirmation" when `ai_booking_mode = pending_approval`

## What I Will Change (Code)

### 1. SQL Migration: Fix `fn_compute_available_slots` to handle windows format
Update lines 80-81 to normalize before reading open/close:

```text
IF day_hours ? 'windows' AND jsonb_array_length(day_hours->'windows') > 0 THEN
  open_time := (day_hours->'windows'->0->>'open')::time;
  close_time := (day_hours->'windows'->0->>'close')::time;
ELSE
  open_time := (day_hours->>'open')::time;
  close_time := (day_hours->>'close')::time;
END IF;
```

### 2. Edge Function: Fix `elevenlabs-check-availability/index.ts`
Add a `normalizeHours` helper that extracts `open`/`close` from either format. Update lines 316-317 and line 320 to use the normalized values instead of `dayHours.open` / `dayHours.close`.

### 3. Edge Function: Add pending-booking prompt to `agentBasePrompts.ts`
Add a new constant `PENDING_BOOKING_OVERRIDE` with instructions like:
- "After creating a booking, inform the customer that their appointment is pending confirmation and someone from the team will reach out to confirm."

Inject it in `buildPromptForCapabilities` when `ai_booking_mode` is available. Since `buildPromptForCapabilities` doesn't currently receive `ai_booking_mode`, I'll add it as an optional parameter.

### 4. Wire `ai_booking_mode` into prompt builder
In `buildBusinessContext.ts` (~line 3263), pass `ctx.ai_settings.ai_booking_mode` to `buildPromptForCapabilities` so it can conditionally include the pending-booking instruction.

### 5. Database fixes for Blue Boxer
- Insert `assistant_settings` row with `ai_booking_mode = 'pending_approval'`, `calendar_provider = 'google'`, `same_day_enabled = true`
- Update `min_lead_hours` from 24 to 2

### 6. Deploy and verify
Deploy `elevenlabs-check-availability` and test `compute-available-slots` to confirm slots are returned.

## What You Need To Do (ElevenLabs Dashboard)

**Nothing changes about the universal agent setup.** The `ai_booking_mode` variable is already registered in the voice context contract and gets passed as a dynamic variable automatically. However, you should verify these two things in the ElevenLabs dashboard:

1. **Confirm `ai_booking_mode` is listed as a Dynamic Variable** on the Service agent -- it should already be there since it's in the contract, but verify it appears with value `{{ai_booking_mode}}`. If it's missing, add it as a new dynamic variable.

2. **No per-client changes needed** -- the prompt injection happens server-side via `buildPromptForCapabilities`. The agent will automatically receive the pending-booking behavioral instruction when any tenant has `ai_booking_mode = pending_approval`. This keeps the agent universal.

## Files Modified

| File | Change |
|------|--------|
| SQL migration (new) | Update `fn_compute_available_slots` to handle windows hours format |
| `supabase/functions/elevenlabs-check-availability/index.ts` | Add `normalizeHours` helper, fix business hours reading |
| `supabase/functions/_shared/agentBasePrompts.ts` | Add `PENDING_BOOKING_OVERRIDE` constant, update `buildPromptForCapabilities` signature |
| `supabase/functions/_shared/buildBusinessContext.ts` | Pass `ai_booking_mode` to prompt builder |
| Database (Blue Boxer tenant) | Insert `assistant_settings` row, reduce `min_lead_hours` to 2 |


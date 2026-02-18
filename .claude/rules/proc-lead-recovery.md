---
paths:
  - "supabase/functions/start-lead-recovery/**"
  - "supabase/functions/check-recovery-context/**"
  - "supabase/functions/process-recovery-response/**"
  - "supabase/functions/execute-recovery-action/**"
  - "supabase/functions/complete-lead-recovery/**"
  - "supabase/functions/run-recovery-scheduler/**"
  - "src/components/leads/**"
  - "src/hooks/useLead*"
---
# Behavioral Rules: Lead Recovery & Follow-up

When working on the lead recovery system, ALWAYS follow these procedures.

## Lead Recovery Flow (understand before changing)

1. **Trigger:** Call ends with outcome = `followup`, `lost`, or `escalated` (from elevenlabs-webhook)
2. **Start:** `start-lead-recovery` creates sequence record with recovery template
3. **Schedule:** Actions scheduled based on template (immediate SMS, 2hr call, 24hr email)
4. **Execute:** `execute-recovery-action` sends SMS/call/email per schedule
5. **Track:** `process-recovery-response` updates status on customer reply
6. **Complete:** `complete-lead-recovery` marks sequence done (converted or abandoned)
7. **Retry:** `retry-failed-deliveries` handles failed actions with exponential backoff

## Recovery Templates

| Template | Trigger | Sequence |
|----------|---------|----------|
| `callback_requested` | Customer asked for callback | Immediate SMS → 2hr call → 24hr email |
| `lost_call` | Call ended without booking | 1hr SMS → 4hr call → 48hr final email |
| `escalated` | AI escalated to human | Immediate staff notify → 30min follow-up call |

## When Modifying Recovery Logic

- NEVER block the elevenlabs-webhook waiting for recovery to start — fire-and-forget
- ALWAYS create the sequence record BEFORE scheduling any actions
- ALWAYS respect the customer's timezone for scheduling callbacks
- Log all actions to both `lead_recovery_actions` and `handoff_attempts`
- Recovery SMS/calls use the SAME Twilio integration as handoffs

## When Debugging Recovery Issues

Follow this sequence:
1. Check `ai_call_sessions.outcome` — was it `followup`, `lost`, or `escalated`?
2. Check `lead_recovery_sequences` — was a sequence created?
3. Check `lead_recovery_actions` — were actions scheduled? What's their `action_status`?
4. Check `run-recovery-scheduler` cron — is it picking up due actions?
5. Check `execute-recovery-action` logs — did execution succeed?
6. Check Twilio logs — was SMS/call actually delivered?

## Retry Logic (same as handoffs)

- `retry-failed-deliveries` cron runs every 5 minutes
- Exponential backoff: 5 min → 10 min → 20 min → 40 min → abandon
- Max 4 retry attempts per action
- Failed after max retries → alert via `check-handoff-failures`

## North Star Connection

This system directly implements: **"Every lead gets answered. Every opportunity gets pushed to booking."** Recovery is how we catch the leads that didn't convert on the first call.

## Key Files (7 edge functions)

- Start: `supabase/functions/start-lead-recovery/index.ts`
- Context: `supabase/functions/check-recovery-context/index.ts`
- Response: `supabase/functions/process-recovery-response/index.ts`
- Execute: `supabase/functions/execute-recovery-action/index.ts`
- Complete: `supabase/functions/complete-lead-recovery/index.ts`
- Scheduler cron: `supabase/functions/run-recovery-scheduler/index.ts`
- Retry cron: `supabase/functions/retry-failed-deliveries/index.ts`

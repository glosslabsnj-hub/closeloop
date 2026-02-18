---
paths:
  - "supabase/functions/**"
---
# Edge Functions Catalog (86 total)

## By Domain
| Domain | Functions | Key Ones |
|--------|-----------|----------|
| Voice (Twilio/ElevenLabs) | 13 | twilio-inbound, elevenlabs-webhook, elevenlabs-init, elevenlabs-conversation-token |
| ElevenLabs Agent Tools | 10 | elevenlabs-suggest-availability, elevenlabs-check-availability, elevenlabs-create-booking, elevenlabs-create-dispatch-job, elevenlabs-check-service-area, elevenlabs-cancel-booking, elevenlabs-add-to-waitlist, elevenlabs-create-callback, elevenlabs-lookup-dispatch-status |
| Booking & Calendar | 10 | booking-handoff, availability-suggest, check-availability, compute-available-slots, create-calendar-event, calendar-oauth-start/callback, sync-availability, refresh-calendar-list, cron-calendar-sync |
| Dispatch | 12 | dispatch-handoff, create-dispatch-request, compute-distance-eta, eta-route, optimize-route, check-impound, get-impound-lot-info, get-impound-release-info |
| Orders | 2 | order-handoff, print-receipt |
| Intelligence | 9 | process-call-outcome, detect-patterns, generate-insights, build-weekly-digest, retrieve-business-memory, retrieve-intent-rules, record-observation, get-intelligence-dashboard, analyze-call-outcome |
| Lead Recovery | 7 | start-lead-recovery, check-recovery-context, process-recovery-response, execute-recovery-action, complete-lead-recovery, run-recovery-scheduler, retry-failed-deliveries |
| Knowledge | 2 | retrieve-knowledge, process-knowledge-upload |
| Estimates | 4 | estimate-generate-pdf, estimate-public-view, estimate-public-action, estimate-send-email |
| Admin | 6 | admin-reset-password, create-tenant, cleanup-test-users, seed-test-tenants, health-db, provision-twilio-number |
| Billing | 3 | track-usage, get-usage-status, stripe-webhook |
| Delivery | 2 | universal-delivery, check-handoff-failures |
| Other | 6 | trigger-workflow, manage-session-locks, ai-text-reply, ai-plan-response, copilot-context, record-audit-event |

## Auth Patterns in Edge Functions
- **JWT auth:** `requireAuthedTenant(req)` — verifies Supabase JWT, resolves tenant membership
- **Service role:** `serviceClient()` — unrestricted DB access for system operations
- **Internal secret:** `requireInternalSecret(req)` — `x-closeloop-secret` header for AI/internal calls
- **Admin secret:** `requireAdminSecret(req)` — `x-admin-secret` for sensitive operations

## Cron Functions (7)
- `cron-calendar-sync` — every 5 min, syncs all active calendar connections
- `generate-insights` — daily, synthesizes patterns into actionable insights
- `build-weekly-digest` — weekly, comprehensive metrics summary
- `check-handoff-failures` — monitors failed deliveries, sends alerts
- `run-recovery-scheduler` — schedules next lead recovery actions
- `retry-failed-deliveries` — retries with exponential backoff (5 min base, 2x multiplier)
- `detect-patterns` — auto-triggered from process-call-outcome

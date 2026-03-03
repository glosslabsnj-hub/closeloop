# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-03 1:58 AM ET (receptionist_eng — AI simulator + booking module fixes)

### What Was Done
- **5 QA bugs fixed** (commit 4fef504, all deployed):
  1. **ai-plan-response conversation memory**: Accepts `conversationHistory` array. Multi-turn simulator conversations now maintain context across messages.
  2. **ai-plan-response date/time injection**: Current date/time (in tenant timezone) added to AI system prompt. AI no longer asks "what day is today?"
  3. **Booking module safety (scenarioQuestions.ts)**: Changed `overridesBase: true` → `false` on "AI Books Appointments" question. Answering "No" to auto-booking no longer removes the entire booking module from service mode tenants.
  4. **Webhook module safety net (elevenlabs-webhook)**: Mode-default modules now merged into enabled_modules even when array is non-empty but incomplete. Ensures "booking" is always present for service mode.
  5. **ElevenLabs date/time awareness (twilio-inbound)**: `current_date_time` and `current_timezone` injected into dynamic variables for voice agents.
- Build: Clean (0 errors), Tests: 685/685 passing
- Deployed: ai-plan-response, elevenlabs-webhook, twilio-inbound + frontend

### Previous Session: 2026-03-03 12:01 AM ET (receptionist_fix — Admin tenant context hardening)
- Hardened admin tenant context persistence on direct URL navigation (commit 810d29f)

### Build Status
- Build: Clean (0 errors)
- Tests: 685/685 passing
- Commit: 4fef504
- Pushed to main, deployed to production

### MODE PROGRESS
- SERVICE: 30/42 QA-verified (71%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **ai-plan-response**: Uses Anthropic Claude Haiku 4.5. Accepts `conversationHistory` array for multi-turn context. Injects current date/time in tenant timezone. FAQs+services always injected. Policy-type KB entries in POLICIES section.
- **Booking module vs AI booking behavior**: The "booking" module controls infrastructure (DB routing, tool availability). The `ai_booking_mode` setting controls auto-book vs request-callback. `overridesBase: false` ensures module is never removed from base defaults.
- **elevenlabs-webhook module merging**: Mode-default modules are ALWAYS merged into tenant's enabled_modules. Empty array → full defaults. Non-empty array → missing defaults added. This prevents routing failures when tenant config is incomplete.
- **ElevenLabs dynamic vars include date/time**: `current_date_time` and `current_timezone` available as `{{current_date_time}}` in agent prompts.
- **Booking customer linkage**: bookings table has NO customer_id or customer_name. Link is `lead_id → leads.full_name`.
- **Admin tenant context persistence (3-layer defense)**: localStorage + effectiveTenantId bridge + AppLayout redirect backup.
- **Super_admin auth**: TWO layers: DB `has_tenant_access()` + edge function `requireAuthedTenant`.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools.
- **AI edge functions use Anthropic API**: ALL 12 use `ANTHROPIC_API_KEY` with `api.anthropic.com/v1/messages`, model `claude-haiku-4-5-20251001`.
- **Edge function deployment**: `SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d'"' -f2) npx supabase functions deploy [name] --project-ref yltzlvzgwkidbeqaoevp`

### Remaining Work
- QA verification of ai_testing gates (booking creation, SMS, callbacks, simulator)
- 2 BLOCKED gates (Google Calendar OAuth, SMS A2P registration)

### Next Priorities
1. QA re-test of HVAC ai_testing round 2 (booking creation should now work)
2. Verify simulator multi-turn conversation works in production
3. Continue fixing any remaining FAIL gates from QA feedback

Review the code changes for $ARGUMENTS with this checklist:

1. **Golden Path integrity**: Does this change break the flow? (Twilio inbound -> twilio-inbound -> buildBusinessContext -> ElevenLabs register-call -> conversation -> elevenlabs-webhook -> CanonicalPayload -> deterministic routing -> handoff functions -> automation runs -> handoff attempts logged)
2. **No hardcoded demo data** in product paths — all app pages must read/write real DB data
3. **Customer identity**: customers table uses (tenant_id, phone_e164) as unique constraint. Phone must be E.164 normalized
4. **Module gating**: Behavior driven ONLY by business_mode + enabled_modules (industry is only for defaults/templates)
5. **ElevenLabs safety**: Never pass nulls to dynamic variables (use empty strings). Never speak placeholders like "None"
6. **Twilio safety**: twilio-inbound must always return HTTP 200 + valid TwiML, even on errors
7. **HIPAA scope**: HIPAA rules apply ONLY to medical tenants, must not affect other tenants
8. **Security**: No exposed secrets, SQL injection, XSS, or command injection
9. **TypeScript**: Proper typing, no `any` unless absolutely necessary
10. **Tests**: Are there tests for the changed behavior? Should there be?

Provide findings organized by severity: Critical > Warning > Suggestion.

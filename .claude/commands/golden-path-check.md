Trace and verify the CloseLoop Golden Path is intact. Check each link in the chain:

1. **Twilio inbound** (`supabase/functions/twilio-inbound/`): Receives call, returns TwiML. Must always return HTTP 200.
2. **buildBusinessContext** (`supabase/functions/_shared/` or `get-business-context`): Loads tenant config, business_mode, enabled_modules.
3. **ElevenLabs register-call** (`supabase/functions/elevenlabs-init/` or `elevenlabs-conversation-token/`): Registers call with ElevenLabs. No null dynamic variables.
4. **Conversation**: ElevenLabs handles the voice conversation.
5. **ElevenLabs webhook** (`supabase/functions/elevenlabs-webhook/`): Receives conversation result.
6. **CanonicalPayload**: Extracts structured data from conversation.
7. **Deterministic routing**: Routes based on intent x enabled_modules. No entities created for disabled modules.
8. **Handoff functions**: booking-handoff, dispatch-handoff, order-handoff, etc.
9. **Automation runs**: trigger-workflow, universal-delivery, etc.
10. **Handoff attempts logged**: All handoff attempts recorded.

For each step:
- Verify the edge function exists and has correct logic
- Check that data flows correctly to the next step
- Flag any broken links, missing error handling, or null propagation

Report: PASS/FAIL for each step, with details on any failures.

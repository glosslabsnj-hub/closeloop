Debug the issue: $ARGUMENTS

**Debugging approach for CloseLoop:**

1. **Identify the layer:**
   - Frontend (React/Vite) → Check browser console, component state, TanStack Query cache
   - Edge Function (Deno) → Check Supabase function logs, request/response shapes
   - Database (PostgreSQL) → Check RLS policies, migration state, constraints
   - Voice/Telephony → Check Twilio logs, ElevenLabs webhook payloads
   - Routing → Check intent detection, enabled_modules, business_mode

2. **Trace the data flow:**
   - Follow the Golden Path: Twilio → twilio-inbound → buildBusinessContext → ElevenLabs → elevenlabs-webhook → CanonicalPayload → routing → handoff
   - Identify where the data breaks or diverges

3. **Common issues to check:**
   - Null values reaching ElevenLabs dynamic variables
   - Missing tenant_id in queries (RLS will silently filter)
   - Phone numbers not normalized to E.164
   - Module disabled but code trying to create entities for it
   - CORS headers missing on edge function responses

4. **Fix and verify:**
   - Make the fix
   - Write a test if the bug is in routing/module logic
   - Verify the Golden Path still works end-to-end

Help me deploy Supabase Edge Functions: $ARGUMENTS

**Deployment checklist:**

1. **Pre-deploy verification:**
   - Run `npm run build` to ensure frontend compiles
   - Run `npm run test` to ensure tests pass
   - Check for any TODO/FIXME in the functions being deployed
   - Verify no hardcoded demo data in product paths
   - Verify no nulls passed to ElevenLabs dynamic variables
   - Verify Twilio-facing functions return HTTP 200 + valid TwiML on errors

2. **Deploy edge functions:**
   - Single function: `supabase functions deploy <function-name>`
   - All functions: `supabase functions deploy`
   - With env vars: check `.env` or Supabase dashboard secrets

3. **Post-deploy verification:**
   - Check function logs: `supabase functions logs <function-name>`
   - Verify the Golden Path is intact (run /golden-path-check if in doubt)
   - Test the deployed function endpoint

4. **Rollback plan:**
   - Previous version available via git history
   - Redeploy previous commit's version if issues found

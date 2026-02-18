Help me with the Supabase Edge Function: $ARGUMENTS

Follow these patterns for CloseLoop edge functions:

**Structure:**
- Each function lives in `supabase/functions/<function-name>/index.ts`
- Shared utilities go in `supabase/functions/_shared/`
- Use Deno runtime with TypeScript

**Required patterns:**
- Import shared deps from `_shared/`
- Use `createClient` from `@supabase/supabase-js` for DB access
- Always return proper HTTP responses with CORS headers
- For Twilio-facing functions: ALWAYS return HTTP 200 + valid TwiML, even on errors
- For ElevenLabs-facing functions: Never include null values in dynamic variables (use empty strings)
- Respect tenant isolation: always filter by tenant_id
- Log errors but don't expose internals in responses

**If creating a new function:**
1. Create `supabase/functions/<name>/index.ts`
2. Follow existing function patterns in the codebase
3. Add CORS handling
4. Add error handling that doesn't leak internals

**If debugging an existing function:**
1. Read the function source
2. Check the _shared dependencies it uses
3. Trace the data flow
4. Identify the issue


## What’s happening (root cause, based on your actual call data)

You changing the tool fields to “Required” didn’t fix the behavior because:

1) **“Required” in the tool config doesn’t force the agent to *ask***  
It only forces the agent to *send something* for that parameter. When the agent doesn’t have the name, it often sends a placeholder to satisfy the schema (example from your database: a dispatch job was created with `customer_name = "not provided"`).

2) **Your Twilio inbound call path is not applying our dispatch prompt override at all**  
Your phone calls are going through:
- `supabase/functions/twilio-inbound/index.ts` → ElevenLabs `POST /v1/convai/twilio/register-call`

That function currently sends only a **minimal** `dynamic_variables` payload and **does not include `conversation_config_override`**.  
So the dispatch agent is effectively running whatever prompt is currently configured in ElevenLabs (or a weaker prompt than our “always ask name + confirm phone” dispatch flow).

Evidence:
- Recent dispatch jobs show `customer_name: "not provided"` and/or `Unknown` in `dispatch_jobs`
- The most recent tool calls are hitting `create-dispatch-request` (not `elevenlabs-create-dispatch-job`), which currently **does not enforce “ask name”** and can succeed using caller ID

## Goal

Make the dispatch agent reliably:
- **asks for the customer name** (at least once, and early)
- **confirms phone** (last 4 if caller ID exists; otherwise asks for the full number)
- **doesn’t store placeholder junk** like “not provided” as a customer name
- while still allowing the dispatch job to be created if the caller refuses (your stated intention)

---

## Implementation plan (backend + voice behavior)

### A) Fix the voice prompt actually used on phone calls (critical)
**Change**: Update `supabase/functions/twilio-inbound/index.ts` to pass a **prompt override** during `register-call`.

- Build (or retrieve) a proper dispatch system prompt on the server side.
- Include it in the `register-call` request as:
  - `conversation_initiation_client_data.conversation_config_override.agent.prompt.prompt`

Why this matters:
- This makes your dispatch agent follow the “ASK NAME + CONFIRM PHONE” flow even if the ElevenLabs dashboard prompt is imperfect.
- It also means you don’t need to rely on the “Required” checkbox to force behavior.

**Performance/safety requirement (Twilio timeouts):**
- Keep Twilio response fast.
- Implement a “fast path”:
  1) Attempt to build a full prompt using existing shared context builders (preferred).
  2) If it can’t finish quickly, fall back to a **minimal but strict dispatch identity prompt** that only enforces:
     - ask name before dispatch
     - confirm last 4 digits / request phone
     - never use placeholders like “not provided”
  3) Always return valid TwiML (no matter what).

**Files involved**
- `supabase/functions/twilio-inbound/index.ts`
- (reuse existing shared prompt building logic from) `supabase/functions/_shared/buildBusinessContext.ts` and `supabase/functions/_shared/agentBasePrompts.ts` when feasible

---

### B) Stop placeholder names from polluting your database (data quality guardrail)
Right now, because of the “Required” tool field, the agent can send garbage like `"not provided"` and we will store it as a customer name.

**Change**: Add a small “placeholder detection + sanitization” layer inside:
- `supabase/functions/create-dispatch-request/index.ts`
- and (for completeness) `supabase/functions/elevenlabs-create-dispatch-job/index.ts`

Rules:
- Treat these as “missing name”:
  - `""`, `"unknown"`, `"not provided"`, `"n/a"`, `"na"`, `"none"`, `"caller"`, `"customer"`, etc. (case-insensitive, trimmed)
- If missing:
  - store `customer_name` as `"Unknown"` (internal only)
  - do not overwrite a real customer name with placeholders
- Add lightweight logging (no PII) to `ai_event_logs` like:
  - stage: `dispatch_identity_missing`
  - fields: tool used, placeholder detected, whether caller_phone existed, session id

This ensures even if the agent still misbehaves occasionally, your CRM/dispatch queue doesn’t fill up with “not provided”.

**Files involved**
- `supabase/functions/create-dispatch-request/index.ts`
- `supabase/functions/elevenlabs-create-dispatch-job/index.ts`

---

### C) Make “confirm last 4 digits” easy and consistent (optional but strong)
**Change**: Add a derived dynamic variable (or compute in prompt) for last4.

- In the Twilio call path we already have `caller_phone`.
- We can pass:
  - `caller_phone_last4` = last 4 digits (empty if unavailable)

Then the prompt can say:
- “I’ve got your number ending in {{caller_phone_last4}} — is that the best number?”

This reduces model “hesitation” and makes behavior more consistent.

**Files involved**
- `supabase/functions/twilio-inbound/index.ts`
- (optional) shared dynamic variable builder if we decide to unify the Twilio path with the canonical context system

---

### D) Align tool naming confusion (avoid prompt/tool mismatch)
Your production calls are currently using **`create-dispatch-request`** as the dispatch creation tool endpoint.

We’ll do one of these (I’ll implement whichever is safest without breaking anything):
1) **Keep current tool endpoint**, but update the dispatch prompt override text to refer to the “dispatch creation tool” generically (so it works whether your tool is named `create_dispatch_job` or `create_dispatch_request` in ElevenLabs), OR
2) Standardize the dispatch agent to use `create_dispatch_job` → `elevenlabs-create-dispatch-job` going forward, while keeping `create-dispatch-request` for backward compatibility.

This prevents the agent prompt from instructing the model to call a tool name it doesn’t have.

---

## Verification (end-to-end, measurable)
After changes, we’ll verify using real call + database checks:

1) **Make a test phone call** to the dispatch line.
2) Confirm the agent asks:
   - pickup
   - dropoff (if applicable)
   - vehicle
   - **name**
   - **“number ending in ____”** confirmation (or asks for full phone if caller ID isn’t present)
3) Confirm the created `dispatch_jobs` row:
   - `customer_name` is a real name (not “not provided”)
4) Confirm logs:
   - new `ai_event_logs` entries show whether identity was captured/missing
5) Repeat once with the caller refusing to give a name:
   - dispatch still created
   - stored name becomes `"Unknown"` (not “not provided”)

---

## Important note about the “Required” checkbox (recommended settings)
Even after we fix the prompt path, I recommend:
- **Do not make `customer_name` required** in the tool schema if you want “non-blocking” behavior.
  - Required often causes the model to invent/fill placeholders.
- If you want “must ask but can proceed on refusal,” the best combo is:
  - Prompt override + placeholder sanitization (this plan)

---

## Also detected: project TypeScript build errors (must fix to keep the app shippable)
Separate from the voice issue, the project currently has TypeScript errors that will block builds/publishing. I will fix these in the same implementation pass so you don’t regress elsewhere:

- `BookingBehaviorSettings.tsx` + `CalendarConnectionStep.tsx`: mismatch between UI enum (`auto_book/pending_approval`) and backend enum (`auto_confirm/pending`)
- `BrainPreviewPanel.tsx` + `SetupProgressBar.tsx`: undefined variable `t` (should use `tenant`)
- `CalendarConnectionWizard.tsx`: unsafe `unknown` → typed state assignments (add casting/validation)
- `useTenantConfig.ts`: `enabled_modules` parsing needs `string[]` sanitization
- `useWorkflows.ts`: strict Supabase typed inserts failing; adjust typing safely without touching the auto-generated types file
- `computeQuote.ts`: ensure arithmetic is performed on `number` (cast/normalize `baseDuration`)

---

## Files we expect to change (summary)
Backend functions:
- `supabase/functions/twilio-inbound/index.ts`
- `supabase/functions/create-dispatch-request/index.ts`
- `supabase/functions/elevenlabs-create-dispatch-job/index.ts`

Frontend build fixes:
- `src/components/ai/BookingBehaviorSettings.tsx`
- `src/components/dashboard/CalendarConnectionStep.tsx`
- `src/components/brain/explainability/BrainPreviewPanel.tsx`
- `src/components/brain/layout/SetupProgressBar.tsx`
- `src/components/settings/CalendarConnectionWizard.tsx`
- `src/hooks/useTenantConfig.ts`
- `src/hooks/useWorkflows.ts`
- `src/lib/computeQuote.ts`

---

## Expected outcome
After this:
- Dispatch phone calls will consistently run with a prompt that explicitly requires a *real* attempt at name + phone confirmation.
- “Required” tool fields won’t be your only enforcement lever (and won’t result in “not provided” being stored).
- The app will compile cleanly again.

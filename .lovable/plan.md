

# Fix Callback-Only Mode for Smiles Auto Works

## What's Happening Now

The AI is still trying to book appointments because of two code bugs and some inaccurate data. The good news: all the right callback-only instructions already exist in the system -- they're just not being delivered to the AI agent.

## What This Plan Does

**You do NOT need to edit your ElevenLabs prompt.** The system already has excellent callback-only instructions built in -- they just aren't reaching the agent due to two code bugs. This fix connects the wiring so it works automatically.

### 1. Fix the two code bugs (the real problem)

**Bug A -- Prompt builder ignores callback-only mode**
The code that builds the AI's instructions calls two functions but forgets to tell them "this is a callback-only business." So the callback-only rules never get included in the prompt.

**Bug B -- Prompt never sent to ElevenLabs**
Even if the prompt were built correctly, the system only sends custom prompts to ElevenLabs for dispatch/towing businesses. Smiles Auto Works is a "service" business, so the prompt gets thrown away and ElevenLabs uses its default dashboard prompt (which has booking logic).

### 2. Fix inaccurate FAQs

| Current FAQ | Problem | Fix |
|-------------|---------|-----|
| "Do you offer mobile service?" -- "Yes" | They don't offer mobile service | Delete this FAQ |
| "Do you charge for estimates?" -- "book online" | There's no online booking | Update to "Give us a call and we'll take a look" |

### 3. Add a "General Auto Repair" catch-all service

Right now there are 6 specific services listed. Since the shop handles a huge range of auto repair work, we'll add a "General Auto Repair" entry with `quote_only` pricing. This tells the AI: "we do pretty much everything automotive -- just collect the details and we'll call back with a quote."

### 4. Add operating hours

No hours are configured, so the AI can't tell callers when the shop is open. We'll add typical auto shop hours (Mon-Fri 8am-6pm, Sat 8am-2pm) that can be adjusted later in the Business Brain.

### 5. Redeploy

Push the updated backend functions so the fix takes effect on real calls.

## Expected Result

After this fix, when someone calls:
1. "Hi, thanks for calling Smiles Auto Works, how can I help you?"
2. Caller: "I need a turbo replacement"
3. "We can definitely help with that. Can I get your name?"
4. Collects name, confirms phone number
5. "Great, I'll have someone from our team reach out to you to get that taken care of."
6. Creates a callback record -- no availability check, no booking attempt

The AI will still be smart -- it knows the shop's services, hours, and can answer questions. It just won't try to schedule anything.

---

## Technical Details

### File Changes

**`supabase/functions/_shared/buildBusinessContext.ts` (lines 3095-3110)**
Pass `ai_behavior_mode` to both prompt builder functions:

```typescript
const aiBehaviorMode = ctx.ai_settings.ai_behavior_mode as "full_service" | "callback_only" | undefined;
const capabilityPrompt = buildPromptForCapabilities(caps, ctx.tenant.industry_slug, aiBehaviorMode);
// ...
const basePrompt = getBasePromptForMode(businessMode, aiBehaviorMode);
```

**`supabase/functions/elevenlabs-init/index.ts` (lines 620-629)**
Send prompt override for callback-only businesses, not just dispatch:

```typescript
const isCallbackOnly = context?.ai_settings?.ai_behavior_mode === "callback_only";
const conversationConfigOverride =
  (context?.tenant.business_mode === "dispatch" || isCallbackOnly) && systemPrompt
    ? { agent: { prompt: { prompt: systemPrompt } } }
    : undefined;
```

### Database Changes

**Delete inaccurate FAQ:**
- Remove "Do you offer mobile service?" (id: `0bcd30d2-...`)

**Update misleading FAQ:**
- "Do you charge for estimates?" answer changed to: "No, we provide free estimates! Give us a call and we'll take a look at no cost."

**Add General Auto Repair service:**
- Name: "General Auto Repair"
- Price type: `quote_only`
- Description: "Full-service auto repair -- engine, transmission, electrical, suspension, and more. Tell us what's going on and we'll get back to you with a plan."

**Add operating hours:**
- Mon-Fri: 8:00 AM - 6:00 PM
- Sat: 8:00 AM - 2:00 PM
- Sun: Closed

### Redeploy
- `elevenlabs-init`
- `build-business-brain`
- `get-business-context`


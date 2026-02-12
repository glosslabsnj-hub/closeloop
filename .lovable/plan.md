

# Fix: Custom Greeting Script + Ensure All Business Brain Data Reaches ElevenLabs

## The Core Problem

The greeting script is stored correctly and sent as `{{greeting_script}}` dynamic variable. But ElevenLabs agents have a **`first_message`** setting (configured in the dashboard) that fires *before* any prompt logic runs. So even though the prompt says "Use the custom greeting if one is set: {{greeting_script}}", the agent already spoke its default first message.

## Safest Route (3 changes, no breaking risk)

### Change 1: elevenlabs-init -- Add `first_message` override (Production Twilio calls)

This function already uses `conversation_config_override` successfully for dispatch/callback-only modes (lines 620-630). We simply extend it to **always** include `agent.first_message` when a greeting script exists. This is safe because:
- `elevenlabs-init` is the Client Data Webhook (not `register-call` which breaks with overrides)
- The override pattern is already proven working in this exact function

```typescript
// Current (lines 620-630):
const conversationConfigOverride =
  (context?.tenant.business_mode === "dispatch" || isCallbackOnly) && systemPrompt
    ? { agent: { prompt: { prompt: systemPrompt } } }
    : undefined;

// New: Always build override when greeting exists OR dispatch/callback mode
const greetingScript = dynamicVariables.greeting_script;
let conversationConfigOverride: Record<string, unknown> | undefined;

if (greetingScript || ((context?.tenant.business_mode === "dispatch" || isCallbackOnly) && systemPrompt)) {
  conversationConfigOverride = { agent: {} };
  if (greetingScript) {
    conversationConfigOverride.agent.first_message = greetingScript;
  }
  if ((context?.tenant.business_mode === "dispatch" || isCallbackOnly) && systemPrompt) {
    conversationConfigOverride.agent.prompt = { prompt: systemPrompt };
  }
}
```

### Change 2: VoiceAgentTest.tsx -- Pass `first_message` override (Browser tests)

The browser test component calls `startSession()` with `dynamicVariables` but no `overrides`. We add `overrides.agent.first_message` when a greeting script is present. This is safe because:
- `startSession` already accepts an `overrides` parameter per the ElevenLabs SDK
- It only adds the override when a greeting exists, otherwise no change

```typescript
// In startSession calls, add overrides when greeting exists:
const greetingOverride = data?.dynamicVariables?.greeting_script
  ? { agent: { first_message: data.dynamicVariables.greeting_script } }
  : undefined;

await conversation.startSession({
  conversationToken: data.token,
  connectionType: "webrtc" as const,
  dynamicVariables: toSafeVars(data.dynamicVariables),
  overrides: greetingOverride,
});
```

### Change 3: voiceContextContract.ts -- Mode-aware greeting fallback

Currently `greeting_script` defaults to `""` (empty string). When empty, the agent falls back to whatever is hardcoded in the ElevenLabs dashboard. We update the default to generate a mode-appropriate greeting using the business name, so there is always a sensible first message.

```typescript
// In the registry entry for greeting_script:
{
  key: "greeting_script",
  defaultValue: "",  // Changed to compute at runtime below
  // ...
}

// In buildDynamicVariables, after building vars:
if (!vars.greeting_script) {
  vars.greeting_script = `Thanks for calling ${vars.business_name || "us"}, how can I help you today?`;
}
```

## What This Does NOT Touch (safe boundaries)

| Component | Status | Why it's safe |
|-----------|--------|---------------|
| `twilio-inbound` / `register-call` | NOT modified | `conversation_config_override` breaks register-call -- we don't touch it |
| `buildBusinessContext` | NOT modified | Already correctly extracts greeting_script from DB |
| Prompt templates | NOT modified | The `{{greeting_script}}` reference stays as-is for in-conversation behavior |
| ElevenLabs dashboard | No change needed | The override from our code takes priority over dashboard first_message |

## Files to Modify

| File | Change | Risk |
|------|--------|------|
| `supabase/functions/elevenlabs-init/index.ts` | Add `first_message` to existing override block (lines 620-639) | Very low -- extending existing pattern |
| `src/components/ai/VoiceAgentTest.tsx` | Add `overrides` param to `startSession` calls (3 locations) | Very low -- optional SDK parameter |
| `supabase/functions/_shared/buildBusinessContext.ts` | Add fallback greeting when `greeting_script` is empty | Very low -- only fills empty values |

## Result

- **Production Twilio calls**: Custom greeting spoken immediately via `first_message` override in elevenlabs-init
- **Browser test calls**: Custom greeting spoken via SDK `overrides` parameter
- **Empty greeting**: Falls back to "Thanks for calling [Business Name], how can I help you today?"
- **All other Business Brain data**: Already flowing correctly (services, hours, FAQs, policies all confirmed working)

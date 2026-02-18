---
paths:
  - "supabase/functions/elevenlabs-*/**"
  - "supabase/functions/_shared/agentToolsConfig*"
  - "supabase/functions/_shared/agentBasePrompts*"
  - "supabase/functions/_shared/agentResolver*"
  - "**/elevenlabs*.cjs"
  - "**/elevenlabs*.mjs"
  - "**/ELEVENLABS_AGENT*"
---
# Behavioral Rules: ElevenLabs Agent Work

When working on ANY ElevenLabs agent, tool, or prompt, ALWAYS follow these procedures automatically.

## Before Making Changes

1. **Read the edge function interface first** — understand what parameters the function expects before modifying agent tools
2. **Read `agentToolsConfig.ts`** — understand existing tool definitions before adding/modifying
3. **Read `agentBasePrompts.ts`** — understand existing prompt patterns before editing

## When Creating or Modifying Agent Tools

ALWAYS include these parameters in EVERY tool:
```typescript
tenant_id:       { type: 'string', required: true }   // CRITICAL: must be required
conversation_id: { type: 'string', required: false }   // Recommended for audit trail
```

NEVER:
- Create tools without `tenant_id` (causes 100% failure rate in production)
- Mark `tenant_id` as optional
- Create tools from scratch — always use `ELEVENLABS_AGENT_STANDARD_TEMPLATE.js` and `addStandardContext()` helper

## When Modifying Agent Prompts

ALWAYS ensure the system prompt:
1. Instructs the agent to pass `{{tenant_id}}` to ALL tool calls
2. Instructs the agent to pass `{{conversation_id}}` to ALL tool calls
3. Includes error recovery: max 2 retries, then offer callback
4. Includes response validation: check `success: true/false` before confirming to customer

## When Modifying Dynamic Variables

Execution order is CRITICAL:
1. Configure dynamic variables FIRST (before tools exist)
2. Create tools with `addStandardContext()` helper
3. Attach tools to agent (delete old `tools` field before adding `tool_ids`)

NEVER pass null values — always coerce to empty string `""`.

## Before Finishing Any ElevenLabs Work

ALWAYS remind the user to run: `node audit_all_elevenlabs_agents.cjs`
The audit must show 0 critical issues before any deployment.

## Key Files

- Template: `ELEVENLABS_AGENT_STANDARD_TEMPLATE.js`
- Audit script: `audit_all_elevenlabs_agents.cjs`
- Tool configs: `_shared/agentToolsConfig.ts`
- Agent prompts: `_shared/agentBasePrompts.ts`
- Dynamic variables: `_shared/voiceContextContract.ts`
- Agent resolver: `_shared/agentResolver.ts`

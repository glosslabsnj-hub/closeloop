---
paths:
  - "supabase/functions/**"
---
# ElevenLabs Agent Configuration Standards

**CRITICAL: All ElevenLabs agents and tools MUST follow this pattern.**

## Tool Parameter Requirements

**EVERY tool must include these parameters:**

```typescript
{
  tenant_id: {
    type: 'string',
    description: 'The tenant_id from your system prompt context. Always include this.',
    required: true,  // CRITICAL - MUST be required
    enum: null
  },
  conversation_id: {
    type: 'string',
    description: 'Conversation tracking ID for linking tool calls to AI sessions',
    required: false,  // Optional but recommended
    enum: null
  }
}
```

**Why this matters:**
- `tenant_id` enables RLS, correct tenant routing, prevents data leaks between tenants
- `conversation_id` enables audit trails, session tracking, debugging tool calls
- Missing these parameters causes 100% tool failure rate in production

**Template:** Use `ELEVENLABS_AGENT_STANDARD_TEMPLATE.js` for all new tools. Never create tools from scratch.

**Verification:** Run `audit_all_elevenlabs_agents.cjs` before deploying any agent. Must show 0 critical issues.

## Dynamic Variables Requirements

**EVERY agent must configure dynamic variables BEFORE creating tools:**

Required variables (always include):
- `tenant_id` (runtime value, injected by system)
- `conversation_id` (runtime value, injected by system)
- `business_name`, `business_mode`, `timezone`, `caller_phone`, `tone`

**Pattern:** See `update_dispatch_dynamic_vars.cjs` for complete template (126+ variables)

**Execution order (critical):**
1. Configure dynamic variables FIRST
2. Create tools with `addStandardContext()` helper
3. Attach tools to agent (delete old `tools` field before adding `tool_ids`)

## System Prompt Requirements

**EVERY system prompt must:**
1. Instruct agent to pass `{{tenant_id}}` to ALL tools (from dynamic variables)
2. Instruct agent to pass `{{conversation_id}}` to ALL tools
3. Include error recovery protocol for tool failures (max 2 retries, then callback)
4. Include tool response validation: check `success: true/false` before confirming to customer

**Never:**
- Create tools without tenant_id/conversation_id parameters
- Deploy agents without running audit script first
- Skip dynamic variable configuration
- Mark tenant_id as optional (must be required)

## Pre-Deployment Checklist

Before deploying any ElevenLabs agent:
- [ ] Read edge function interface to understand required parameters
- [ ] Configure dynamic variables (run update script)
- [ ] Create tools using `addStandardContext()` helper from template
- [ ] Verify tenant_id is REQUIRED in all tools
- [ ] Upload system prompt to ElevenLabs UI without validation errors
- [ ] Run `node audit_all_elevenlabs_agents.cjs` → must show 0 critical issues
- [ ] Test tool calls in production with real phone call

**Files:**
- Template: `ELEVENLABS_AGENT_STANDARD_TEMPLATE.js`
- Audit: `audit_all_elevenlabs_agents.cjs`
- Documentation: `docs/agents/ELEVENLABS_PREVENTION_SYSTEM_COMPLETE.md`

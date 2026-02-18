# ElevenLabs Agent Quality Assurance System

**Created:** 2026-02-17
**Purpose:** Prevent configuration errors across ALL ElevenLabs agents
**Status:** Ready for use

---

## Overview

This document provides:
1. ✅ **Audit system** to check all existing agents
2. ✅ **Standard template** for creating new agents/tools
3. ✅ **Pre-deployment checklist** to prevent errors
4. 📝 **Recommended additions to CLAUDE.md** for permanent memory

---

## 1. Immediate: Audit All Existing Agents

### Run the Audit

```bash
node audit_all_elevenlabs_agents.cjs
```

### What It Checks

✅ Dynamic variables configured
✅ Required dynamic variables present (tenant_id, business_name, etc.)
✅ All tools have `tenant_id` parameter (REQUIRED)
✅ All tools have `conversation_id` parameter (optional)
✅ Tool parameters match edge function requirements
✅ System prompt references tenant_id

### Current Status

**DISPATCH Agent:** ✅ PERFECT (0 critical issues)
**SERVICE Agent:** ⚠️ 12 warnings (tenant_id not always marked required)

### Fix SERVICE Agent (Optional)

The SERVICE agent works but could be improved. To fix warnings:

1. Mark `tenant_id` as REQUIRED in all tools
2. Standardize parameter names to match edge functions

---

## 2. Standard Template for Future Agents

**File:** `ELEVENLABS_AGENT_STANDARD_TEMPLATE.js`

### Usage

```javascript
const { addStandardContext, convertToApiSchema } = require('./ELEVENLABS_AGENT_STANDARD_TEMPLATE');

// 1. Define your business-specific tool
const myTool = {
  name: 'create_dispatch_job',
  description: 'Create a new dispatch request...',
  parameters: {
    customer_name: { type: 'string', required: true, ... },
    pickup_address: { type: 'string', required: true, ... },
    // ... your business params
  }
};

// 2. Add standard context (tenant_id + conversation_id)
const toolWithContext = addStandardContext(myTool);

// 3. Convert to ElevenLabs API schema
const apiPayload = convertToApiSchema(toolWithContext);

// 4. Create via API
fetch(`${BASE_URL}/v1/convai/tools`, {
  method: 'POST',
  body: JSON.stringify({ tool_config: apiPayload })
});
```

### Standard Context Parameters

**EVERY tool automatically gets:**

```javascript
{
  tenant_id: {
    type: 'string',
    description: 'The tenant_id from your system prompt context.',
    required: true  // CRITICAL
  },
  conversation_id: {
    type: 'string',
    description: 'Conversation tracking ID',
    required: false
  }
}
```

---

## 3. Pre-Deployment Checklist

**Before creating any new agent, complete this checklist:**

### A. Pre-Creation Phase

- [ ] Read edge function interface (`supabase/functions/elevenlabs-[tool-name]/index.ts`)
- [ ] List all required parameters the edge function expects
- [ ] List all optional parameters
- [ ] Note any enum values or specific formats needed
- [ ] Check if SERVICE/DISPATCH agents have similar tool for reference

### B. Dynamic Variables

- [ ] Configure dynamic variables BEFORE creating tools
- [ ] Include these REQUIRED variables:
  - [ ] tenant_id
  - [ ] conversation_id (optional but recommended)
  - [ ] business_name
  - [ ] business_mode
  - [ ] timezone
  - [ ] caller_phone
  - [ ] tone
- [ ] Add mode-specific variables (dispatch, service, food, medical)
- [ ] Set reasonable default values (never null/undefined)
- [ ] Run: `node update_[agent]_dynamic_vars.cjs`

### C. Tool Creation

- [ ] Define business-specific parameters
- [ ] Use `addStandardContext()` to add tenant_id/conversation_id
- [ ] Verify tenant_id is marked REQUIRED
- [ ] Verify conversation_id is marked optional
- [ ] Match parameter names EXACTLY to edge function
- [ ] Define enum values for categorical parameters
- [ ] Test: Create tools and attach to agent
- [ ] Verify: No "both tools and tool_ids" error

### D. System Prompt

- [ ] Instruct agent to pass `{{tenant_id}}` to ALL tools
- [ ] Instruct agent to pass `{{conversation_id}}` to ALL tools
- [ ] Include error recovery protocol
- [ ] Include tool response validation (check `success` field)
- [ ] Upload to ElevenLabs UI
- [ ] Verify: No validation errors on save

### E. Verification

- [ ] Run: `node audit_all_elevenlabs_agents.cjs`
- [ ] Result: 0 critical issues
- [ ] All tools show tenant_id (required)
- [ ] All tools show conversation_id (optional)
- [ ] Test tool call in ElevenLabs playground
- [ ] Verify edge function receives tenant_id in request body

### F. Testing

- [ ] Test complete flow (tool call → edge function → success response)
- [ ] Test error recovery (tool failure → agent asks clarification)
- [ ] Test tenant isolation (correct tenant's data returned)
- [ ] Test conversation tracking (tool results linked to session)
- [ ] Test with REAL call, not just playground

---

## 4. Add to CLAUDE.md (Permanent Memory)

**Recommendation:** Add this section to `CLAUDE.md` after line 63 ("For ElevenLabs: return JSON..."):

```markdown
## ELEVENLABS AGENT CONFIGURATION STANDARDS

**CRITICAL: All ElevenLabs agents and tools MUST follow this pattern.**

### Tool Parameter Requirements

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
- `tenant_id` enables RLS, correct tenant routing, prevents data leaks
- `conversation_id` enables audit trails, session tracking, debugging

**Template:** Use `ELEVENLABS_AGENT_STANDARD_TEMPLATE.js` for all new tools

**Verification:** Run `audit_all_elevenlabs_agents.cjs` before deploying any agent

### Dynamic Variables Requirements

**EVERY agent must configure dynamic variables BEFORE tools:**

Required variables:
- `tenant_id` (runtime value)
- `conversation_id` (runtime value)
- `business_name`, `business_mode`, `timezone`, `caller_phone`, `tone`

**Pattern:** See `update_dispatch_dynamic_vars.cjs` for template

### System Prompt Requirements

**EVERY system prompt must:**
1. Instruct agent to pass `{{tenant_id}}` to ALL tools
2. Instruct agent to pass `{{conversation_id}}` to ALL tools
3. Include error recovery protocol for tool failures
4. Include tool response validation (check `success: true/false`)

**Never:**
- Create tools without tenant_id/conversation_id
- Deploy without running audit script
- Skip dynamic variable configuration
```

---

## 5. Common Mistakes to Avoid

### ❌ MISTAKE 1: Forgetting tenant_id/conversation_id

**Wrong:**
```javascript
const tool = {
  parameters: {
    customer_name: { ... },
    pickup_address: { ... }
    // Missing tenant_id and conversation_id!
  }
};
```

**Right:**
```javascript
const tool = addStandardContext({
  parameters: {
    customer_name: { ... },
    pickup_address: { ... }
    // tenant_id and conversation_id added automatically
  }
});
```

### ❌ MISTAKE 2: Creating tools before dynamic variables

**Wrong Order:**
1. Create tools
2. Configure dynamic variables ← Too late!

**Right Order:**
1. Configure dynamic variables FIRST
2. Then create tools
3. Then attach tools to agent

### ❌ MISTAKE 3: Not running audit before deployment

**Wrong:**
- Create agent → Deploy → Discover issues in production

**Right:**
- Create agent → Run audit → Fix issues → Deploy

### ❌ MISTAKE 4: Copying tools without standard context

**Wrong:**
```javascript
// Copy SERVICE agent tool without checking
const dispatchTool = { ...serviceAgentTool };
```

**Right:**
```javascript
// Use template, add standard context
const dispatchTool = addStandardContext({
  name: 'new_tool',
  parameters: { ... }
});
```

---

## 6. Incident Post-Mortem: DISPATCH Agent (2026-02-17)

### What Happened

- Created DISPATCH agent tools WITHOUT tenant_id/conversation_id parameters
- Would have caused 100% tool failure rate in production
- User caught the issue before deployment ✅

### Root Cause

1. **No reference check:** Didn't verify SERVICE agent configuration first
2. **No edge function check:** Didn't read edge function interfaces
3. **No template usage:** Created tools from scratch instead of using pattern
4. **No audit step:** Didn't verify configuration before declaring "done"

### Prevention (Implemented)

1. ✅ Created `audit_all_elevenlabs_agents.cjs` - automated verification
2. ✅ Created `ELEVENLABS_AGENT_STANDARD_TEMPLATE.js` - reusable template
3. ✅ Created pre-deployment checklist
4. ✅ Documented pattern for CLAUDE.md

### Lessons Learned

**For AI Agent (Claude):**
- ALWAYS check existing agent configurations first
- ALWAYS read edge function interfaces before creating tools
- ALWAYS use standard templates instead of creating from scratch
- ALWAYS run audit script before declaring completion

**For User:**
- Having multiple agents means errors can compound
- Automated verification is essential
- Templates prevent copy-paste errors
- Active memory (CLAUDE.md) should include ElevenLabs patterns

---

## 7. Files Created

| File | Purpose | When to Use |
|------|---------|-------------|
| `audit_all_elevenlabs_agents.cjs` | Verify all agents | Before any deployment |
| `ELEVENLABS_AGENT_STANDARD_TEMPLATE.js` | Tool template + helpers | When creating new tools |
| `fix_dispatch_tools_add_context.cjs` | One-time fix script | Already used (archived) |
| `CRITICAL_FIX_CONTEXT_PARAMETERS.md` | Incident documentation | Reference |
| `DISPATCH_AGENT_DEPLOYMENT_SUCCESS.md` | Deployment results | Reference |
| `ELEVENLABS_PREVENTION_SYSTEM_COMPLETE.md` | This document | Reference & training |

---

## 8. Quick Reference Commands

```bash
# Audit all agents
node audit_all_elevenlabs_agents.cjs

# Create new agent with standard template
# 1. Copy ELEVENLABS_AGENT_STANDARD_TEMPLATE.js
# 2. Fill in business-specific parameters
# 3. Use addStandardContext() helper
# 4. Run deployment script

# Check specific agent
node -e "
  // Fetch and inspect specific agent/tool
  // Use this for debugging
"
```

---

## 9. Next Steps

### Immediate (You Choose)

1. **Review this document** - Does it cover everything you need?
2. **Add to CLAUDE.md** - Copy section 4 into CLAUDE.md for permanent memory
3. **Fix SERVICE agent** (optional) - Make tenant_id required in all 10 tools
4. **Set up pre-commit hook** (optional) - Run audit before git commits

### For Future Agent Creation

1. **Always start with template** - `ELEVENLABS_AGENT_STANDARD_TEMPLATE.js`
2. **Always run audit** - `audit_all_elevenlabs_agents.cjs`
3. **Always follow checklist** - Section 3 above

---

## 10. Success Metrics

**Goal:** 0 critical configuration issues in production

**Measure:**
- Run audit before every deployment
- 0 critical issues = ready to deploy
- Warnings = review but not blocking

**Track:**
- Number of agents with 0 issues
- Time to deploy new agent (should decrease with templates)
- Number of production incidents due to configuration (should be 0)

---

## Conclusion

This system ensures:
- ✅ All tools have tenant_id (required) and conversation_id (optional)
- ✅ Automated verification before deployment
- ✅ Reusable templates prevent errors
- ✅ Documented patterns in active memory (CLAUDE.md)

**No more missing context parameters in production!**

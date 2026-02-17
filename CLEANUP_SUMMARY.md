# DISPATCH Agent Cleanup & Configuration

## Problem Summary

**What Went Wrong:**
- Created 44 duplicate tools in ElevenLabs workspace (should be ~11 unique tools)
- DISPATCH agent had NO tools attached (0/7)
- DISPATCH agent knowledge base showed old date (Feb 4) despite updates
- SERVICE agent was unaffected but its tools were at risk

**Root Cause:**
- Misunderstood ElevenLabs architecture (tools are workspace-level, assigned via `tool_ids`)
- Created new tools instead of assigning existing tool IDs
- Knowledge base updates weren't persisting due to API structure issues

## Solution Implemented

### Scripts Created

1. **analyze_current_state.cjs**
   - Identifies SERVICE agent's 10 protected tools
   - Groups workspace tools by name to find duplicates
   - Outputs `cleanup_analysis.json` with deletion plan

2. **cleanup_duplicate_tools.cjs**
   - Deletes 34 duplicate tools
   - Preserves SERVICE agent's 10 tools
   - Outputs `cleanup_results.json`

3. **fix_dispatch_knowledge_base.cjs**
   - Deletes old knowledge base item
   - Uploads new content as file (8,016 chars)
   - Attaches to DISPATCH agent
   - Outputs `kb_fix_results.json`

4. **configure_dispatch_tools_final.cjs**
   - Creates 7 new tools with correct API schema structure
   - Attaches tools to DISPATCH agent via `prompt.tool_ids`
   - Outputs `dispatch_tools_config_results.json`

5. **run_full_cleanup.cjs** (Master Script)
   - Orchestrates all steps in correct order
   - Includes safety delays and verification
   - Displays comprehensive summary

### Execution Order

```
Run: node run_full_cleanup.cjs
```

**Process:**
1. 10-second safety countdown (Ctrl+C to cancel)
2. Clean up 34 duplicate tools (preserving SERVICE agent tools)
3. Wait 3 seconds for ElevenLabs to process deletions
4. Fix DISPATCH knowledge base (delete & recreate)
5. Wait 2 seconds
6. Configure 7 DISPATCH tools with correct structure
7. Display results summary

**Individual Scripts (if needed):**
```bash
# Step by step if you prefer manual control:
node analyze_current_state.cjs
node cleanup_duplicate_tools.cjs
node fix_dispatch_knowledge_base.cjs
node configure_dispatch_tools_final.cjs
```

## Expected Results

### SERVICE Agent (Should NOT Change)
- ✅ 10 tools still configured
- ✅ Knowledge base intact (Feb 13 date)
- ✅ All functionality preserved

### DISPATCH Agent (After Fixes)
- ✅ Knowledge Base: Fresh timestamp (today), 8,016 chars, file-type
- ✅ Tools: 7 configured and attached
  1. check_service_area
  2. create_dispatch_job
  3. lookup_dispatch_status
  4. check_availability
  5. suggest_availability
  6. create_booking
  7. create_callback

### Workspace
- ✅ ~17 tools total (10 SERVICE + 7 DISPATCH)
- ✅ No duplicates
- ✅ Clean and organized

## Verification Checklist

### ElevenLabs Dashboard

**DISPATCH Agent:**
- [ ] Knowledge tab shows today's date
- [ ] Knowledge content displays 8,016+ characters
- [ ] Contains dispatch terminology (taxi, towing, courier, locksmith)
- [ ] Tools tab shows 7 webhook tools
- [ ] Each tool has correct URL: `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-{tool-name}`
- [ ] Each tool has `X-CL-Secret` header configured

**SERVICE Agent:**
- [ ] Still shows 10 tools
- [ ] Knowledge tab shows Feb 13 date
- [ ] No changes to configuration

### Test Scenarios

**DISPATCH Agent Quick Test:**
1. Call DISPATCH agent test number
2. Provide an address → Should trigger `check_service_area`
3. Say "I need a tow" → Should collect name and create job
4. Ask "where's my driver?" → Should trigger `lookup_dispatch_status`

**SERVICE Agent Regression Test:**
1. Call SERVICE agent test number
2. Verify booking flow still works
3. Verify tools are called correctly

## Files Generated

**Analysis:**
- `cleanup_analysis.json` - Tool analysis with deletion plan

**Results:**
- `cleanup_results.json` - Cleanup execution results
- `kb_fix_results.json` - Knowledge base fix results
- `dispatch_tools_config_results.json` - Tool configuration results

**Reference:**
- `service_tool_ids.json` - SERVICE agent's protected tool IDs

## Rollback Plan (If Needed)

If something goes wrong:

1. **SERVICE agent broken:**
   - Tool IDs are saved in `service_tool_ids.json`
   - Full config saved in `service_agent_full_config.json`
   - Can restore via PATCH to agent endpoint

2. **DISPATCH agent needs rollback:**
   - Knowledge base old ID: `9C1yKiQZd9QSVbFzIXZe`
   - Can remove tools by setting `tool_ids: []`

3. **Workspace too messy:**
   - Contact ElevenLabs support to restore from backup

## Key Learnings

1. **Tools are workspace-level** - Shared across agents, assigned via `tool_ids`
2. **Knowledge bases** - File-type uploads more reliable than text-type for content updates
3. **API structure** - `conversation_config.agent.prompt.tool_ids` is the correct path
4. **Verification** - Always GET after PATCH to confirm changes applied
5. **Safety first** - Protect existing working configurations (SERVICE agent)

## Agent IDs Reference

- **SERVICE Agent:** `agent_4701kg1vwhzqfxmvzh032nhvx434`
- **DISPATCH Agent:** `agent_2601kghfpmckez3t2n6p7bmcpac4`
- **Secret ID:** `9G30VIglbkIoULRKR7xD` (for tool webhooks)

## Next Steps After Cleanup

1. ✅ Verify both agents in dashboard
2. ✅ Run test calls to both agents
3. ✅ Check Supabase edge function logs for tool calls
4. Document proper workflow for future agent configurations
5. Consider creating a tool management utility to prevent duplicates

## Success Criteria

- [ ] SERVICE agent untouched and working
- [ ] DISPATCH agent has 7 tools configured
- [ ] DISPATCH agent knowledge base shows today's date
- [ ] Workspace has ~17 tools (no duplicates)
- [ ] Test call to DISPATCH agent successfully uses tools
- [ ] No API errors in Supabase function logs

---

**Status:** Ready to execute
**Created:** 2026-02-17
**Scripts:** 5 total (1 master orchestrator + 4 individual)
**Estimated Time:** ~2-3 minutes

# ElevenLabs Comprehensive Prompts - Quick Deployment Guide

## ✅ Ready to Deploy

All files are built and validated. You're ready to restore full AI functionality to all businesses.

## 📊 What You're Deploying

| Agent | Size | Status |
|-------|------|--------|
| **DISPATCH** | 29,209 chars | ✅ Comprehensive + Workflow Configs |
| **SERVICE** | 55,754 chars | ✅ Comprehensive + Workflow Configs |

## 🚀 Deployment Steps (5 minutes)

### 1. Deploy the Prompts

```bash
node deploy_comprehensive_prompts.cjs
```

**What it will ask you:**
- "Which agent(s) do you want to deploy?" → Type `3` (both agents)
- Shows preview and comparison → Review carefully
- "Deploy this prompt to DISPATCH agent?" → Type `yes`
- "Deploy this prompt to SERVICE agent?" → Type `yes`

**What it does:**
- ✅ Backs up current prompts to `docs/backups/`
- ✅ Uploads new comprehensive prompts to ElevenLabs
- ✅ Verifies upload succeeded

### 2. Verify Deployment

```bash
node verify_comprehensive_deployment.cjs
```

**Should show:**
```
✓ DISPATCH: All checks passed
✓ SERVICE: All checks passed
```

If any checks fail, **STOP** and investigate.

### 3. Test with Real Calls

**DISPATCH Test:**
1. Call your test towing company
2. Agent should:
   - Ask for pickup location
   - Quote pricing correctly
   - Handle workflow config (vehicle timing, payment timing)
   - Convert ETA to natural speech

**SERVICE Test:**
1. Call your test service business
2. Agent should:
   - Greet warmly
   - Check availability
   - Handle deposit timing per config
   - Create booking successfully

**Workflow Config Test:**
1. Navigate to Business Brain → Workflow Config → Dispatch
2. Change `vehicle_info_timing` from "before_pricing" to "after_pricing"
3. Call again → Agent should ask for vehicle info AFTER pricing
4. Change it back → Call again → Agent should ask BEFORE pricing

✅ If all tests pass → **Deployment successful!**

## 🔧 What's Fixed

**Before (Broken):**
- DISPATCH prompt: 9,317 chars (60% missing)
- No workflow configuration support
- All towing/dispatch businesses broken

**After (Fixed):**
- DISPATCH prompt: 29,209 chars (100% comprehensive)
- Full workflow configuration support
- All businesses operational + configurable

## 🛟 If Something Goes Wrong

**Rollback immediately:**
```bash
node restore_original_prompts.cjs
```

This restores the previous working prompts from backup.

## 📋 Post-Deployment Checklist

- [ ] Both agents deployed successfully
- [ ] Verification script passed all checks
- [ ] Test calls work correctly
- [ ] Workflow config changes affect agent behavior
- [ ] No error spikes in call logs
- [ ] Monitor for 24-48 hours
- [ ] Commit to git after confirming stability

## 🎯 Success Criteria

✅ **DISPATCH agent:**
- Handles towing/roadside calls
- Quotes pricing accurately (local vs long-distance)
- Adapts to workflow config settings
- Converts ETA minutes to natural speech

✅ **SERVICE agent:**
- Books appointments correctly
- Handles deposit timing per config
- Suggests alternatives (if enabled)
- Creates bookings with correct status

✅ **Workflow configs:**
- Changes in Business Brain affect agent behavior
- Each business can configure unique workflows
- Same agent, different behavior per business

## 📞 Support

If you encounter issues:
1. Check `COMPREHENSIVE_PROMPTS_DEPLOYMENT_SUMMARY.md` for detailed troubleshooting
2. Review call logs in Supabase
3. Verify workflow config variables in database
4. Rollback if needed: `node restore_original_prompts.cjs`

---

**You're ready to deploy! This will restore full AI functionality to all businesses.**

Run: `node deploy_comprehensive_prompts.cjs`

# IMPOUND Agent: Data Flow Audit & Fix Plan

## Executive Summary

**Goal:** Make IMPOUND agent 1000% production-ready using same methodology as DISPATCH & SERVICE agents.

**Current Status:** IMPOUND agent has all the tools and database structure, but suffers from a critical data flow gap - **impound data is NOT being fetched from database and injected into ElevenLabs**.

**Confidence Level:** 0% → 100% after implementation (simpler than DISPATCH/SERVICE - only 3 phases needed)

**Impact:** IMPOUND agent will be able to provide lot information, hours, fees, and release requirements to callers.

---

## What Exists Today

### Database Tables (3)
1. **impound_lots** - Location, address, hours, phone
2. **impound_vehicles** - Vehicles currently in impound
3. **impound_settings** - Per-tenant fees, payment methods, release requirements

### Edge Function Tools (3)
1. **check-impound** - Vehicle lookup by license plate, VIN, or description
2. **get-impound-lot-info** - Returns lot location and hours
3. **get-impound-release-info** - Calculates fees and release requirements

### Dynamic Variables (17)
All defined in `voiceContextContract.ts`:
- `has_impound` - Whether capability is enabled
- `impound_lot_id` - Default lot UUID
- `impound_lot_name` - Lot name
- `impound_lot_address` - Full address
- `impound_lot_phone` - Phone number
- `impound_lot_hours_today` - Today's hours
- `impound_lot_hours_summary` - Weekly hours summary
- `impound_is_open_now` - Boolean
- `impound_next_open` - When lot next opens
- `impound_base_tow_fee` - Base tow fee in dollars
- `impound_daily_storage_fee` - Daily storage fee
- `impound_admin_fee` - Admin fee
- `impound_gate_fee` - Gate fee
- `impound_fee_summary` - Speech-ready fee summary
- `impound_release_requirements` - Comma-separated requirements
- `impound_release_requirements_summary` - Speech-ready requirements
- `impound_accepted_payment` - Accepted payment methods

### Agent Prompt
**File:** `supabase/functions/_shared/agentBasePrompts.ts` - `IMPOUND_INSTRUCTIONS` (lines 2558-2567)
```
## IMPOUND LOT

When handling impound inquiries:
- Ask for vehicle info: year, make, model, color, plate number
- Provide storage rates and release requirements
- Explain pickup process and hours
- If release needs authorization, route to callback
- Required docs typically: valid ID, registration, proof of insurance, tow receipt
```

---

## The Critical Gap

### ❌ PROBLEM: Data Not Flowing
**File:** `supabase/functions/_shared/getBusinessBrainSnapshot.ts`
- Does NOT fetch `impound_lots`
- Does NOT fetch `impound_settings`
- Does NOT return impound data in snapshot

**Result:**
- All 17 impound dynamic variables are EMPTY
- Agent has NO lot information
- Agent has NO fee information
- Agent has NO release requirements
- Agent has NO hours information

### Example: What Happens Today
```
Customer: "What are your lot hours?"
Agent: [impound_lot_hours_today] = ""
Agent: [impound_lot_hours_summary] = ""
Agent: "I'm not sure. Let me transfer you to someone who can help."
```

**This breaks the user's 3 requirements:**
1. ❌ Data IS in Business Brain (impound_settings table), but businesses CAN'T customize their AI
2. ❌ Information is NOT properly injected into ElevenLabs (no data fetching)
3. ❌ ElevenLabs CAN'T properly handle variables (they're all empty)

---

## The Fix: 3-Phase Plan

### 🔥 PHASE 1: Fetch Impound Data (HIGH PRIORITY)
**Goal:** Add impound data fetching to `getBusinessBrainSnapshot.ts`

**Steps:**
1. Add `ImpoundSnapshot` type definition
2. Add queries to fetch:
   - Default impound lot (where `is_default = true` or first active lot)
   - Impound settings (fees, payment methods, requirements)
3. Add to `Promise.all` batch execution
4. Return in snapshot under `snapshot.impound`

**Expected Result:**
- `ctx.impound.lot_name` = "Hawks Towing Impound Lot"
- `ctx.impound.lot_address` = "123 Storage St, Austin, TX 78701"
- `ctx.impound.lot_phone` = "+15125551234"
- `ctx.impound.lot_hours_today` = "8 AM to 5 PM"
- `ctx.impound.base_tow_fee_cents` = 15000 ($150)
- `ctx.impound.daily_storage_cents` = 3500 ($35)
- `ctx.impound.release_requirements` = ["valid_id", "registration", "payment"]
- `ctx.impound.accepted_payment_summary` = "Cash, Credit Card, or Debit Card"

### ✅ PHASE 2: Verify Variable Mapping
**Goal:** Ensure all 17 impound variables correctly map to snapshot data

**Steps:**
1. Review `voiceContextContract.ts` lines 1803-1938
2. Verify all `source: (ctx) => ctx.impound?.field` mappings are correct
3. Ensure defaults are sensible (empty strings for missing data)
4. Test with real data to confirm no nulls passed to ElevenLabs

**Expected Result:**
- All 17 variables populated when impound data exists
- Graceful fallback to empty strings when data missing
- No null/undefined passed to ElevenLabs

### 🎯 PHASE 3: Improve Agent Prompt (OPTIONAL)
**Goal:** Enhance IMPOUND_INSTRUCTIONS for better caller experience

**Current Prompt Issues:**
- Very minimal (only 9 lines)
- Doesn't reference dynamic variables
- Doesn't explain WHEN to use which tool
- Doesn't handle common edge cases (vehicle not found, lot closed, etc.)

**Improvements:**
1. Add clear tool usage instructions
2. Reference dynamic variables (lot hours, fees, requirements)
3. Add edge case handling (vehicle not in system, lot closed, authorization needed)
4. Add helpful post-lookup reminders (bring documents, payment methods, etc.)

**Example Enhanced Prompt:**
```
## IMPOUND LOT

When handling impound inquiries:

### VEHICLE LOOKUP
1. Ask for identification: license plate, VIN, or vehicle description (year, make, model, color)
2. Use **check_impound** tool with tenant_id, license_plate/vin/vehicle_description
3. If found → proceed to release info
4. If not found → offer alternative search or callback

### LOT INFORMATION
**Hours:** {{impound_lot_hours_today}} (use **get_impound_lot_info** tool for details)
**Address:** {{impound_lot_address}}
**Phone:** {{impound_lot_phone}}

### RELEASE INFORMATION
After vehicle is found, use **get_impound_release_info** tool to calculate:
- Total fees (tow + storage + admin + gate)
- Release requirements
- Payment methods accepted

**Typical Requirements:**
{{impound_release_requirements_summary}}

**Payment Methods:**
{{impound_accepted_payment}}

### EDGE CASES
- **Lot Closed:** Provide next open time ({{impound_next_open}})
- **Authorization Needed:** Route to callback
- **Multiple Vehicles Found:** Ask for more details to narrow down
- **Vehicle Not in System:** Suggest checking with local police or other tow companies

### POST-LOOKUP REMINDERS
After providing release info:
- "Make sure to bring {{impound_release_requirements_summary}}"
- "We accept {{impound_accepted_payment}}"
- "The lot is located at {{impound_lot_address}}"
- If closed: "We're closed right now but open {{impound_next_open}}"
```

---

## Files to Modify

### Phase 1: Data Fetching
**File:** `supabase/functions/_shared/getBusinessBrainSnapshot.ts`
- Add `ImpoundSnapshot` interface (lines 100-120)
- Add impound queries (lines 825-854, after workflow config queries)
- Add to Promise.all (lines 876-881)
- Return in snapshot (lines 1368-1374)

### Phase 2: Variable Verification
**File:** `supabase/functions/_shared/voiceContextContract.ts`
- Review lines 1803-1938 (impound variables)
- No changes needed if Phase 1 implemented correctly

### Phase 3: Agent Prompt
**File:** `supabase/functions/_shared/agentBasePrompts.ts`
- Enhance `IMPOUND_INSTRUCTIONS` (lines 2558-2567)

---

## Success Criteria (1000% Complete)

### ✅ Data Flow
- [ ] `getBusinessBrainSnapshot` fetches impound_lots (default lot)
- [ ] `getBusinessBrainSnapshot` fetches impound_settings
- [ ] `voiceContextContract` maps all 17 impound variables
- [ ] Agent receives real values, not empty strings
- [ ] Agent behavior adapts based on impound settings

### ✅ Agent Behavior
- [ ] IMPOUND agent can answer "What are your hours?"
- [ ] IMPOUND agent can provide lot address and phone
- [ ] IMPOUND agent can lookup vehicles by plate/VIN/description
- [ ] IMPOUND agent can calculate release fees
- [ ] IMPOUND agent can explain release requirements
- [ ] IMPOUND agent handles edge cases (not found, closed, authorization needed)

### ✅ Business Owner Experience
- [ ] Business Brain shows impound lot settings (address, hours, phone)
- [ ] Business Brain shows impound fees (tow, storage, admin, gate)
- [ ] Business Brain shows release requirements
- [ ] Changes save successfully and take effect immediately
- [ ] No confusion, no broken features

### ✅ Data Integrity
- [ ] All tenants with impound capability have impound_lots row
- [ ] All tenants with impound capability have impound_settings row
- [ ] No null/undefined in critical fields
- [ ] Defaults are sensible

---

## What Makes Sense vs Doesn't Make Sense

### ✅ Makes Sense
1. **Fetch impound data in getBusinessBrainSnapshot** - Same pattern as workflow_config
2. **Use existing impound_settings defaults** - Already has sensible defaults ($150 tow, $35/day storage)
3. **Keep IMPOUND_INSTRUCTIONS concise** - It's a focused capability, doesn't need 60,000 chars
4. **Map all 17 variables** - Already defined, just need data source

### ❌ Doesn't Make Sense
1. **Create impound_workflow_config table** - Overkill, impound_settings is sufficient
2. **Seed all existing tenants** - Only tenants with `impound_lot` capability need this
3. **Complex prompt improvements** - Keep it simple, tools handle most logic

---

## Expected Impact

### Customer Experience
- Can get lot hours, address, phone over the phone
- Can lookup vehicle status without waiting on hold
- Can get accurate fee calculation instantly
- Fewer "let me transfer you" responses

### Business Revenue
- Faster release information = faster payment = faster turnover
- Better caller experience = fewer complaints
- Automated lookups = reduced office workload

### Agent Performance
- Can handle 80%+ impound inquiries without transfer
- Accurate information from database (not guessing)
- Professional caller experience

---

## Deployment Checklist

### Phase 1: Data Fetching
- [ ] Add `ImpoundSnapshot` type to getBusinessBrainSnapshot.ts
- [ ] Add impound_lots query (default lot only)
- [ ] Add impound_settings query
- [ ] Add to Promise.all batch
- [ ] Return in snapshot.impound
- [ ] Test with real tenant that has impound capability
- [ ] Verify all 17 variables populated

### Phase 2: Variable Verification
- [ ] Review all 17 impound variables in voiceContextContract.ts
- [ ] Confirm source functions read from ctx.impound
- [ ] Confirm defaults are sensible (empty strings, not null)
- [ ] Test with tenant WITHOUT impound capability (should gracefully degrade)

### Phase 3: Agent Prompt (Optional)
- [ ] Enhance IMPOUND_INSTRUCTIONS with tool usage guidance
- [ ] Add edge case handling
- [ ] Add post-lookup reminders
- [ ] Test with real call to verify behavior

---

## Timeline Estimate

- **Phase 1:** 30 minutes (straightforward, same pattern as workflow_config)
- **Phase 2:** 15 minutes (verification only, no changes needed)
- **Phase 3:** 30 minutes (optional prompt enhancement)

**Total: 75 minutes to 1000% complete**

---

## Critical Reminder

**IMPORTANT:** While working on IMPOUND agent, we must NOT affect DISPATCH or SERVICE agents. They are working flawlessly.

**Safe Changes:**
- ✅ Add impound data fetching (new code, doesn't touch dispatch/service)
- ✅ Enhance IMPOUND_INSTRUCTIONS (separate constant, doesn't affect DISPATCH_AGENT_BASE_PROMPT)
- ✅ Verify impound variables (already separated in voiceContextContract)

**Unsafe Changes:**
- ❌ Modifying dispatch_universal.txt
- ❌ Modifying service_comprehensive.txt
- ❌ Modifying DISPATCH_AGENT_BASE_PROMPT
- ❌ Modifying SERVICE_AGENT_BASE_PROMPT
- ❌ Changing dispatch_workflow_config or service_workflow_config defaults

---

## Next Steps

1. **Implement Phase 1** - Add impound data fetching
2. **Test Phase 1** - Verify all 17 variables populated
3. **Implement Phase 3** - Enhance agent prompt (optional)
4. **Test End-to-End** - Make real call to IMPOUND agent
5. **Commit Changes** - Document all improvements
6. **Move to SALES Agent** - Next in queue

---

## Questions Answered

### Q: Does IMPOUND need its own workflow_config table?
**A:** No. `impound_settings` table already handles configuration (fees, requirements, payment methods). Adding another config table would be redundant.

### Q: Should we seed all existing tenants with impound data?
**A:** No. Only tenants with `impound_lot` capability need this. Most tenants don't have impound lots.

### Q: How does IMPOUND relate to DISPATCH?
**A:** IMPOUND is accessed via IVR option "2" when calling a dispatch business with `impound_lot` capability. It's a separate agent (ELEVENLABS_AGENT_ID_IMPOUND) but shares the same tenant's data.

### Q: Will this affect DISPATCH or SERVICE agents?
**A:** No. All changes are isolated to IMPOUND-specific code. DISPATCH and SERVICE agents remain untouched.

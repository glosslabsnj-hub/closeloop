# Workflow Configuration System - Testing & Validation Plan

## Pre-Deployment Checklist

### ✅ Database Migration

**File:** `supabase/migrations/20260217_workflow_configs.sql`

**Pre-flight checks:**
1. [ ] Verify migration syntax: `npx supabase db lint`
2. [ ] Review RLS policies for each table
3. [ ] Confirm unique constraints on (tenant_id)
4. [ ] Verify auto-creation trigger on tenants table

**Migration steps:**
```bash
# Apply migration
npx supabase db push

# Verify tables created
npx supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%_workflow_config'"

# Verify RLS enabled
npx supabase db query "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%_workflow_config'"

# Verify defaults seeded
npx supabase db query "SELECT COUNT(*) FROM dispatch_workflow_config"
```

**Expected results:**
- 5 new tables created: dispatch_workflow_config, service_workflow_config, food_workflow_config, medical_workflow_config, general_workflow_config
- RLS enabled on all 5 tables
- Default configs seeded for all existing tenants
- Auto-creation trigger active on tenants table

---

## Phase 5: Migration & Testing

### Test 1: Default Config Behavior

**Objective:** Verify default configs match current agent behavior (no breaking changes)

**Test Cases:**

#### 1.1: DISPATCH Agent - Default Config
```
Test Tenant: Any existing dispatch tenant
Expected Config:
  vehicle_info_timing: "before_pricing"
  vehicle_affects_pricing: true
  luxury_flatbed_recommendation: false
  ask_payment_method: true
  payment_timing: "on_arrival"
  confirm_geocoded_address: true

Test Scenario:
1. Place test call to dispatch tenant
2. Agent should ask for vehicle info BEFORE pricing (current behavior)
3. Agent should NOT mention flatbed for luxury vehicles (current behavior)
4. Agent should discuss payment on arrival (current behavior)

✅ PASS: Behavior identical to pre-migration
❌ FAIL: Any deviation from current workflow
```

#### 1.2: SERVICE Agent - Default Config
```
Test Tenant: Any existing service tenant
Expected Config:
  collect_deposit_upfront: false
  deposit_timing: "at_confirmation"
  suggest_alternatives_when_unavailable: true
  max_alternatives_to_suggest: 3

Test Scenario:
1. Place test call requesting appointment
2. Agent should NOT ask for deposit upfront (current behavior)
3. Agent should suggest alternatives if slot unavailable (current behavior)
4. Agent should offer max 3 alternatives (current behavior)

✅ PASS: Behavior identical to pre-migration
❌ FAIL: Any deviation from current workflow
```

#### 1.3: FOOD Agent - Default Config
```
Test Tenant: Any existing food tenant
Expected Config:
  ask_pickup_vs_delivery: "if_both_enabled"
  default_order_type: "ask"
  allow_menu_customizations: true
  repeat_order_back: true
  confirm_total_before_submit: true

Test Scenario:
1. Place test call for food order
2. Agent should ask "pickup or delivery?" if both enabled (current behavior)
3. Agent should allow modifications (current behavior)
4. Agent should repeat order back (current behavior)

✅ PASS: Behavior identical to pre-migration
❌ FAIL: Any deviation from current workflow
```

---

### Test 2: Hawks Towing Scenario (The Fix!)

**Objective:** Verify the Hawks Towing problem is solved

#### 2.1: Before Config Change
```
Test Tenant: Hawks Towing (or test tenant)
Current Config: vehicle_info_timing = "before_pricing" (default)

Test Scenario:
1. Call in for towing
2. Say: "I need a tow from 123 Main St"
3. Agent asks: "What kind of vehicle is it?"
4. Say: "2020 BMW M340"
5. Agent calls check_service_area WITH vehicle_type parameter
6. Agent quotes: "$150" (includes luxury vehicle consideration)

✅ PASS: Vehicle collected BEFORE pricing
❌ FAIL: Vehicle collected AFTER pricing
```

#### 2.2: After Enabling Luxury Protocol
```
Test Tenant: Hawks Towing
Updated Config:
  vehicle_info_timing: "before_pricing"
  luxury_flatbed_recommendation: true
  awd_detection_enabled: true

Test Scenario:
1. Call in for towing
2. Say: "I need a tow, 2020 BMW M340"
3. Agent detects luxury brand
4. Agent asks: "Is it all-wheel drive?"
5. Say: "Yes"
6. Agent says: "For that vehicle, we'd recommend flatbed to be safe. That work for you?"
7. Agent quotes with flatbed pricing

✅ PASS: Luxury protocol triggered correctly
❌ FAIL: No flatbed recommendation
```

#### 2.3: Alternate Config (Joe's Towing)
```
Test Tenant: Joe's Towing (or test tenant)
Updated Config: vehicle_info_timing = "after_pricing"

Test Scenario:
1. Call in for towing
2. Say: "I need a tow from 123 Main St"
3. Agent asks location questions
4. Agent calls check_service_area WITHOUT vehicle_type
5. Agent quotes: "$100" (flat rate)
6. THEN agent asks: "What are you driving?" (for driver notes)
7. Say: "2020 BMW M340"
8. Agent collects for identification, NOT pricing

✅ PASS: Vehicle collected AFTER pricing
❌ FAIL: Vehicle affects pricing
```

---

### Test 3: UI Functionality

**Objective:** Verify Business Brain UI works correctly

#### 3.1: Navigation
```
Steps:
1. Log into any tenant account
2. Navigate to Business Brain
3. Click "Workflow Config" tab (6th tab)
4. Verify correct mode-specific component loads
   - Dispatch → DispatchWorkflowConfig
   - Service → ServiceWorkflowConfig
   - Food → FoodWorkflowConfig
   - Medical → MedicalWorkflowConfig
   - General → GeneralWorkflowConfig

✅ PASS: Correct component loads per mode
❌ FAIL: Wrong component or error
```

#### 3.2: Save/Update Workflow
```
Test Mode: DISPATCH
Steps:
1. Navigate to Workflow Config tab
2. Change vehicle_info_timing to "after_pricing"
3. Verify "unsaved changes" alert appears
4. Click "Save Changes"
5. Verify toast notification: "Dispatch workflow updated"
6. Refresh page
7. Verify change persisted

✅ PASS: Save works, changes persist
❌ FAIL: Save fails or changes lost
```

#### 3.3: Reset Functionality
```
Steps:
1. Make multiple changes to workflow config
2. Click "Reset" button
3. Verify all changes revert to saved state
4. Verify "unsaved changes" alert disappears

✅ PASS: Reset works correctly
❌ FAIL: Changes not reverted
```

---

### Test 4: Real-Time Propagation

**Objective:** Verify workflow changes propagate to live agents

#### 4.1: Config Change Propagation
```
Test Tenant: Dispatch mode
Steps:
1. Note current vehicle_timing config
2. Place test call → verify current behavior
3. Change vehicle_info_timing via UI
4. Wait 1 minute (for cache refresh)
5. Place another test call
6. Verify agent behavior matches NEW config

✅ PASS: Agent uses new config within 1 minute
❌ FAIL: Agent still using old config after 5 minutes
```

#### 4.2: Dynamic Variable Verification
```
Test: Verify workflow vars in ElevenLabs dynamic_variables
Steps:
1. Set vehicle_info_timing = "after_pricing"
2. Set luxury_flatbed_recommendation = true
3. Trigger call to twilio-inbound endpoint
4. Check logs for dynamic_variables payload
5. Verify presence:
   - dispatch_vehicle_timing = "after_pricing"
   - dispatch_luxury_flatbed_enabled = "true"

✅ PASS: All workflow variables present in payload
❌ FAIL: Variables missing or incorrect
```

---

### Test 5: Edge Cases & Error Handling

#### 5.1: Missing Config (Graceful Fallback)
```
Test: Delete workflow config for a tenant
Steps:
1. DELETE FROM dispatch_workflow_config WHERE tenant_id = 'test-tenant-id'
2. Place test call
3. Agent should fall back to defaults
4. No errors or crashes

✅ PASS: Graceful fallback to defaults
❌ FAIL: Errors or incorrect behavior
```

#### 5.2: Invalid Config Values
```
Test: Insert invalid enum value
Steps:
1. UPDATE dispatch_workflow_config SET vehicle_info_timing = 'invalid_value'
2. Verify database constraint prevents save
3. If bypassed, agent should fall back to default

✅ PASS: Invalid values rejected or defaulted
❌ FAIL: Agent crashes or undefined behavior
```

#### 5.3: Concurrent Updates
```
Test: Multiple users editing same config
Steps:
1. User A opens workflow config
2. User B opens workflow config
3. User A changes vehicle_timing to "after_pricing" and saves
4. User B changes payment_timing to "upfront" and saves
5. Verify both changes persist (no race condition)

✅ PASS: Both changes saved correctly
❌ FAIL: Last write wins, data lost
```

---

### Test 6: Cross-Mode Verification

**Objective:** Ensure each mode has correct workflow config

#### 6.1: Mode Isolation
```
Test: Verify configs don't leak between modes
Steps:
1. Set dispatch config: vehicle_timing = "after_pricing"
2. Switch tenant to service mode
3. Verify service config is independent (NOT dispatch settings)
4. Switch to food mode
5. Verify food config is independent

✅ PASS: Each mode has independent config
❌ FAIL: Configs shared or leaked
```

---

## Regression Testing

### Existing Tenants (10 samples)

Test with 10 randomly selected existing tenants:

```
Tenants to test:
1. [Dispatch] Hawks Towing
2. [Dispatch] Joe's Towing
3. [Service] ABC Plumbing
4. [Service] Quick HVAC
5. [Food] Pizza Palace
6. [Food] Sushi Express
7. [Medical] City Clinic
8. [Medical] Dental Care
9. [General] Auto Sales
10. [General] Consulting Firm

For EACH tenant:
1. Verify default config seeded correctly
2. Place test call
3. Verify behavior matches pre-migration
4. Check for any errors in logs

✅ PASS: All 10 tenants work as before
❌ FAIL: Any tenant shows changed behavior
```

---

## Performance Testing

### Database Query Performance

```sql
-- Test query speed for config fetch
EXPLAIN ANALYZE
SELECT * FROM dispatch_workflow_config WHERE tenant_id = 'test-id';

-- Expected: < 5ms
-- Index should be used: idx_dispatch_workflow_config_tenant_id

-- Test with 1000 tenants
SELECT COUNT(*) FROM dispatch_workflow_config; -- Should be 1000
SELECT AVG(pg_column_size(service_dropoff_rules)) FROM dispatch_workflow_config;
-- Expected: < 1KB per row
```

### API Response Time

```
Test: buildBusinessContext with workflow configs
Expected: < 500ms additional overhead
Method: Compare before/after migration

Before migration: buildBusinessContext avg time = X ms
After migration: buildBusinessContext avg time = X + 50ms (acceptable)
```

---

## Rollback Plan

If critical issues found:

### Option 1: Disable Workflow System (Quick Fix)
```sql
-- Comment out workflow config fetching in getBusinessBrainSnapshot.ts
-- Agent prompts will use fallback defaults
-- No data loss, system continues working
```

### Option 2: Revert Migration (Nuclear Option)
```sql
-- Drop all workflow config tables
DROP TABLE IF EXISTS dispatch_workflow_config CASCADE;
DROP TABLE IF EXISTS service_workflow_config CASCADE;
DROP TABLE IF EXISTS food_workflow_config CASCADE;
DROP TABLE IF EXISTS medical_workflow_config CASCADE;
DROP TABLE IF EXISTS general_workflow_config CASCADE;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_auto_create_workflow_config ON tenants;
DROP FUNCTION IF EXISTS auto_create_workflow_config();
DROP FUNCTION IF EXISTS create_default_workflow_config(uuid, text);

-- Revert code changes
git revert <commit-hash>
```

---

## Success Criteria

### ✅ Must Pass (Blocking Issues)

1. [ ] All 5 workflow config tables created successfully
2. [ ] RLS policies working correctly (no cross-tenant access)
3. [ ] Default configs seeded for all existing tenants
4. [ ] 10 regression tests pass (existing tenants unchanged)
5. [ ] Hawks Towing scenario works (vehicle before pricing)
6. [ ] UI loads and saves configs correctly
7. [ ] No errors in production logs after 24 hours

### ⚠️ Should Pass (High Priority)

8. [ ] Config changes propagate within 1 minute
9. [ ] All edge cases handle gracefully
10. [ ] Performance overhead < 100ms per call
11. [ ] UI responsive (save/load < 1 second)

### 💡 Nice to Have (Medium Priority)

12. [ ] Auto-migration for new tenants works
13. [ ] Concurrent edit handling
14. [ ] Export/import configs (future feature)

---

## Sign-Off Checklist

Before marking Phase 5 complete:

- [ ] Database migration applied successfully
- [ ] All 6 test sections completed
- [ ] Regression testing passed (10/10 tenants)
- [ ] Hawks Towing scenario verified (THE FIX!)
- [ ] UI functionality verified
- [ ] Performance acceptable
- [ ] No critical bugs found
- [ ] Rollback plan documented
- [ ] Production monitoring active

**Approved by:** _______________
**Date:** _______________
**Phase 5 Status:** [ ] COMPLETE [ ] BLOCKED [ ] IN PROGRESS

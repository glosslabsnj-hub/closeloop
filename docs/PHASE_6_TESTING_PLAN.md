# PHASE 6: Comprehensive Testing & Verification Plan

## Overview

Comprehensive end-to-end testing to verify all fixes work correctly before production deployment. This is the final phase before declaring DISPATCH and SERVICE agents "1000% complete."

---

## Testing Approach

### **Test Levels:**
1. **Unit Tests** - Individual components work correctly
2. **Integration Tests** - Data flows between systems
3. **End-to-End Tests** - Complete user journeys work
4. **Agent Behavior Tests** - Real call scenarios
5. **Regression Tests** - Existing functionality still works

### **Test Environments:**
- **Local Development** - Component testing
- **Staging Database** - Migration testing
- **Staging Calls** - Agent behavior testing
- **Production (Limited)** - Final validation with 1-2 test tenants

---

## TEST SUITE 1: Database Migrations

### **1.1: Migration Execution**

**Objective:** Verify migrations run without errors

**Steps:**
```bash
# Check current migration status
cd supabase
npx supabase db diff --file check_current_state

# Review migration files
cat migrations/20260217_workflow_configs.sql
cat migrations/20260218000000_update_workflow_config_defaults.sql

# Verify no conflicts
```

**Expected Result:**
- ✅ No migration conflicts
- ✅ All migrations ready to run

**Acceptance Criteria:**
- [ ] Migrations reviewed
- [ ] No syntax errors
- [ ] Safe to run on staging

---

### **1.2: Workflow Config Creation**

**Objective:** Verify workflow_config rows exist for all tenants

**Test Query:**
```sql
-- Check existing tenants have workflow_config
SELECT
  t.id,
  t.business_name,
  t.business_mode,
  CASE
    WHEN d.id IS NOT NULL THEN 'dispatch ✅'
    WHEN s.id IS NOT NULL THEN 'service ✅'
    WHEN f.id IS NOT NULL THEN 'food ✅'
    WHEN m.id IS NOT NULL THEN 'medical ✅'
    WHEN g.id IS NOT NULL THEN 'general ✅'
    ELSE '❌ MISSING'
  END as workflow_status
FROM tenants t
LEFT JOIN dispatch_workflow_config d ON d.tenant_id = t.id
LEFT JOIN service_workflow_config s ON s.tenant_id = t.id
LEFT JOIN food_workflow_config f ON f.tenant_id = t.id
LEFT JOIN medical_workflow_config m ON m.tenant_id = t.id
LEFT JOIN general_workflow_config g ON g.tenant_id = t.id
ORDER BY t.created_at DESC
LIMIT 20;
```

**Expected Result:**
- ✅ 100% of tenants have workflow_config
- ✅ No "❌ MISSING" rows

**Acceptance Criteria:**
- [ ] All existing tenants have workflow_config
- [ ] Correct mode-specific config created (dispatch → dispatch_workflow_config)

---

### **1.3: Default Values Verification**

**Objective:** Verify defaults match expected values from PHASE 1

**Test Query:**
```sql
-- Check dispatch defaults
SELECT
  t.business_name,
  d.vehicle_info_timing,
  d.luxury_flatbed_recommendation,
  d.awd_detection_enabled,
  d.payment_timing,
  d.confirm_geocoded_address,
  d.driver_callback_script
FROM dispatch_workflow_config d
JOIN tenants t ON t.id = d.tenant_id
LIMIT 5;
```

**Expected Values:**
- vehicle_info_timing: "after_pricing"
- luxury_flatbed_recommendation: true
- awd_detection_enabled: true
- payment_timing: "on_arrival"
- confirm_geocoded_address: true
- driver_callback_script: "Your driver will give you a call when they're about 10 minutes away."

**Acceptance Criteria:**
- [ ] All defaults match expected values
- [ ] No null or empty critical fields

---

### **1.4: Trigger Functionality**

**Objective:** Verify trigger creates workflow_config for new tenants

**Test Steps:**
1. Create test tenant manually in database:
```sql
-- Insert test tenant
INSERT INTO tenants (
  id,
  business_name,
  business_mode,
  timezone
) VALUES (
  gen_random_uuid(),
  'Test Towing LLC',
  'dispatch',
  'America/New_York'
) RETURNING id;
```

2. Check if workflow_config was auto-created:
```sql
-- Verify workflow_config created by trigger
SELECT * FROM dispatch_workflow_config
WHERE tenant_id = '[tenant_id_from_above]';
```

**Expected Result:**
- ✅ dispatch_workflow_config row created automatically
- ✅ All defaults populated

**Acceptance Criteria:**
- [ ] Trigger fires on INSERT
- [ ] Correct workflow_config table chosen based on business_mode
- [ ] Defaults applied

---

## TEST SUITE 2: Data Pipeline

### **2.1: Business Brain Snapshot**

**Objective:** Verify getBusinessBrainSnapshot fetches workflow_config

**Test Method:** Backend function test

**Steps:**
1. Call getBusinessBrainSnapshot for test dispatch tenant
2. Inspect returned snapshot
3. Verify workflow_config present

**Expected Structure:**
```typescript
{
  tenant: { ... },
  services: [ ... ],
  faqs: [ ... ],
  workflow_config: {
    dispatch: {
      vehicle_info_timing: "after_pricing",
      luxury_flatbed_recommendation: true,
      // ... all other fields
    },
    service: null,
    food: null,
    medical: null,
    general: null
  },
  _meta: { ... }
}
```

**Acceptance Criteria:**
- [ ] workflow_config key exists
- [ ] Correct mode config populated
- [ ] Other mode configs are null/empty

---

### **2.2: Voice Context Contract**

**Objective:** Verify voiceContextContract maps workflow variables correctly

**Test Method:** Review variable mappings

**Variables to Check:**
```typescript
// Should all have real values (not placeholders)
dispatch_vehicle_timing: "after_pricing"
dispatch_luxury_flatbed_enabled: "true"
dispatch_awd_detection_enabled: "true"
dispatch_payment_timing: "on_arrival"
dispatch_payment_due_message: "Payment is due when the driver arrives..."
dispatch_confirm_geocoded_address: "true"
dispatch_address_confirmation_script: "Just to confirm, that's at..."
dispatch_driver_callback_script: "Your driver will give you a call..."
```

**Test Query (simulated):**
```typescript
const context = {
  workflow_config: {
    dispatch: {
      vehicle_info_timing: "after_pricing",
      luxury_flatbed_recommendation: true,
      // ...
    }
  }
};

const variables = buildDynamicVariablesFromRegistry(context);

console.log(variables.dispatch_vehicle_timing); // Should be "after_pricing"
console.log(variables.dispatch_luxury_flatbed_enabled); // Should be "true"
```

**Acceptance Criteria:**
- [ ] All workflow variables have real values
- [ ] No undefined/null values
- [ ] Defaults used when workflow_config missing

---

### **2.3: ElevenLabs Variable Injection**

**Objective:** Verify variables reach ElevenLabs agent

**Test Method:** Make test call, inspect logs

**Steps:**
1. Make test call to dispatch tenant
2. Check twilio_event_logs for dynamic_variables payload
3. Verify workflow variables present

**Expected in Logs:**
```json
{
  "dynamic_variables": {
    "dispatch_vehicle_timing": "after_pricing",
    "dispatch_luxury_flatbed_enabled": "true",
    "dispatch_awd_detection_enabled": "true",
    // ... 300+ other variables
  }
}
```

**Acceptance Criteria:**
- [ ] Workflow variables in dynamic_variables payload
- [ ] No raw {{placeholders}} in values
- [ ] Values match database config

---

## TEST SUITE 3: Frontend Components

### **3.1: Flatbed Pricing Dialog**

**Objective:** Verify FlatbedPricingDialog appears and works correctly

**Test Steps:**

**Test Case 1: Dialog Appears for Towing Service**
1. Go to Business Brain → Services
2. Click "Add Service"
3. Enter name: "Local Tow"
4. Enter price: $150
5. Click "Save"

**Expected:**
- ✅ FlatbedPricingDialog appears
- ✅ Question: "Do you charge different prices for flatbed and wheel-lift towing?"
- ✅ Two options: "Yes, different prices" and "No, same price"

**Test Case 2: Create Two Services**
1. Continue from Test Case 1
2. Click "Yes, different prices"
3. See price inputs:
   - Wheel Lift: $150 (pre-filled)
   - Flatbed: $175 (pre-filled)
4. Adjust flatbed to $180
5. Click "Create Both Services"

**Expected:**
- ✅ Two services created:
  - "Local Tow - Wheel Lift" ($150)
  - "Local Tow - Flatbed" ($180)
- ✅ Toast: "Created 2 services: Wheel Lift and Flatbed"

**Test Case 3: Create One Service**
1. Repeat Test Case 1
2. Click "No, same price"
3. Click "Create Service"

**Expected:**
- ✅ One service created: "Local Tow" ($150)
- ✅ Toast: "Service created"

**Test Case 4: Dialog Does NOT Appear**
Test these service names should NOT trigger dialog:
- "Jumpstart" - No dialog (not towing)
- "Tire Change" - No dialog (not towing)
- "Lockout Service" - No dialog (not towing)

**Test Case 5: Non-Dispatch Business**
1. Switch to food business
2. Try to create service "Towing Truck Pizza Delivery"
3. Should NOT show flatbed dialog (business_mode check)

**Acceptance Criteria:**
- [ ] Dialog appears for dispatch + towing services only
- [ ] Both "Yes" and "No" flows work
- [ ] Two services created with correct names/prices
- [ ] Non-towing services don't trigger dialog
- [ ] Non-dispatch businesses don't see dialog

---

### **3.2: Workflow Config Editor**

**Objective:** Verify Business Brain → Workflow Config tab works

**Test Steps:**
1. Go to Business Brain → Workflow Config tab
2. Verify dispatch settings visible (if dispatch mode)
3. Edit a setting (e.g., change payment_timing to "upfront")
4. Click "Save Changes"
5. Verify saved successfully
6. Refresh page
7. Verify change persisted

**Expected Settings Visible:**
- Vehicle Info Collection (3 fields)
- Luxury Vehicle Protocols (4 fields)
- Payment Collection (5 fields)
- Address Protocols (3 fields)
- Expectation Management (3 fields)

**Acceptance Criteria:**
- [ ] All 19 dispatch settings visible (or 15 service settings)
- [ ] Can edit and save
- [ ] Changes persist after refresh
- [ ] Toast shows success message

---

## TEST SUITE 4: Agent Behavior

### **4.1: Luxury Vehicle - AWD Detected**

**Test Scenario:** Customer needs BMW towed

**Call Script:**
```
Customer: "I need my BMW towed"
[Agent should ask location]
Customer: "123 Main Street"
[Agent should run check_service_area]
[Agent should ask AWD]
Customer: "Yeah, it's all-wheel drive"
[Agent should recommend flatbed with explanation]
```

**Expected Agent Response:**
```
Agent: "For AWD vehicles like that BMW, flatbed protects the drivetrain from getting damaged. We'd definitely recommend that. Looking at $180 for the tow. Sound good?"
```

**Verification Points:**
- ✅ Agent asks: "Is it all-wheel drive or four-wheel drive?"
- ✅ Agent explains AWD damage risk
- ✅ Agent quotes flatbed price ($180, not wheel-lift $150)
- ✅ Agent frames as protection, not upsell

**Acceptance Criteria:**
- [ ] AWD question asked before recommendation
- [ ] Explanation includes "drivetrain" or "AWD system"
- [ ] Correct price quoted (flatbed, not wheel-lift)

---

### **4.2: Luxury Vehicle - RWD Detected**

**Test Scenario:** Customer has rear-wheel drive BMW

**Call Script:**
```
Customer: "I need my BMW 3-series towed"
Customer: "123 Main Street"
Customer: "It's rear-wheel drive"
```

**Expected Agent Response:**
```
Agent: "We can use wheel-lift for rear-wheel drive, or flatbed if you want to be extra safe. Flatbed's about $30 more. Preference?"
```

**Verification Points:**
- ✅ Agent gives choice (wheel-lift or flatbed)
- ✅ Agent mentions price difference
- ✅ Customer can choose cheaper option

**Acceptance Criteria:**
- [ ] Customer given choice
- [ ] Price difference mentioned
- [ ] Both options explained clearly

---

### **4.3: Address Confirmation**

**Test Scenario:** Verify geocoded address readback

**Call Script:**
```
Customer: "I'm at 123 Main"
[Agent runs check_service_area, gets geocoded address]
```

**Expected Agent Response:**
```
Agent: "Just to confirm, picking up at 123 Main Street, [City], [State]. That right?"
[Wait for confirmation]
Customer: "Yep, that's it"
Agent: "Great, we'll have someone there in..."
```

**Verification Points:**
- ✅ Agent reads back FULL geocoded address
- ✅ Agent waits for confirmation
- ✅ Agent doesn't proceed until customer confirms

**Acceptance Criteria:**
- [ ] Geocoded address read back verbatim
- [ ] Agent waits for "yes" / "correct" / "that's it"
- [ ] If customer corrects, agent re-runs check_service_area

---

### **4.4: Accurate ETA Ranges**

**Test Scenario:** Verify ETA is given as range, not rounded

**Call Script:**
```
Customer: "How long until someone gets here?"
[Tool returns: eta_min=60, eta_max=75]
```

**Expected Agent Response:**
```
Agent: "Looking at about an hour to an hour and 15 minutes"
```

**NOT:**
```
Agent: "About an hour" ❌ WRONG (rounded)
```

**Test Cases:**
| Tool Returns | Agent Should Say |
|--------------|------------------|
| eta_min=45, eta_max=60 | "About 45 minutes to an hour" |
| eta_min=60, eta_max=75 | "About an hour to an hour and 15 minutes" |
| eta_min=90, eta_max=120 | "Hour and a half to two hours" |
| eta_min=30, eta_max=35 | "About half an hour" (narrow range, can round) |

**Acceptance Criteria:**
- [ ] Full range given when difference is 15+ minutes
- [ ] No rounding that underestimates arrival time
- [ ] Natural speech (not "75 minutes")

---

### **4.5: Post-Dispatch Reminders**

**Test Scenario:** Verify helpful reminder after dispatch created

**Call Script:**
```
[Dispatch successfully created]
```

**Expected Agent Response:**
```
Agent: "Alright, you're all set. Driver is on the way."
Agent: "Your driver will give you a call when they're about 10 minutes away."
Agent: "Make sure you grab anything you need from the car — wallet, phone, registration — before the driver hooks it up."
Agent: "Need anything else, or are you all set?"
```

**Verification Points:**
- ✅ Driver callback expectation set
- ✅ Helpful prep reminder given
- ✅ Asks if they need anything else

**Reminder Examples by Service Type:**
- Towing: "Grab wallet, phone, registration"
- Lockout: "Have your ID ready"
- Flatbed: "Flatbed takes a few extra minutes to load"
- Long-distance: "Driver will give updates along the way"

**Acceptance Criteria:**
- [ ] ALWAYS gives a reminder (mandatory)
- [ ] Reminder matches service type
- [ ] One tip only (not overwhelming)

---

### **4.6: Payment Discussion**

**Test Scenario:** Verify payment mentioned proactively

**Call Script:**
```
[After price quoted]
Customer: "OK, sounds good"
```

**Expected Agent Response:**
```
Agent: "Payment is due when the driver arrives. We accept cash and card."
```

**Verification Points:**
- ✅ Payment timing mentioned
- ✅ Accepted methods mentioned
- ✅ Natural (not forced)

**Acceptance Criteria:**
- [ ] Payment timing mentioned if payment_timing = "on_arrival"
- [ ] Payment methods mentioned
- [ ] Only mentioned if not already discussed

---

## TEST SUITE 5: Edge Cases

### **5.1: Missing Workflow Config**

**Objective:** Verify graceful fallback if workflow_config missing

**Test Setup:**
1. Create tenant without workflow_config (disable trigger)
2. Make test call

**Expected:**
- ✅ voiceContextContract provides default values
- ✅ Agent doesn't see raw {{placeholders}}
- ✅ Call proceeds normally (degraded but functional)

**Acceptance Criteria:**
- [ ] No crashes
- [ ] Sensible fallback values used
- [ ] Business owner can add workflow_config in Business Brain later

---

### **5.2: Corrupted Workflow Config**

**Objective:** Verify handling of invalid data

**Test Setup:**
1. Set workflow_config field to invalid value:
```sql
UPDATE dispatch_workflow_config
SET vehicle_info_timing = 'invalid_value'
WHERE tenant_id = '[test_tenant]';
```

2. Make test call

**Expected:**
- ✅ voiceContextContract uses default ("after_pricing")
- ✅ Agent doesn't crash
- ✅ Call proceeds with fallback value

**Acceptance Criteria:**
- [ ] Invalid values don't crash system
- [ ] Fallback to defaults
- [ ] Error logged for investigation

---

### **5.3: Concurrent Service Creation**

**Objective:** Verify no race conditions in flatbed dialog

**Test Setup:**
1. Open two browser tabs
2. Both create "Local Tow" service simultaneously
3. Both choose "Yes, different prices"

**Expected:**
- ✅ Both dialogs work independently
- ✅ No duplicate services created
- ✅ No database conflicts

**Acceptance Criteria:**
- [ ] No race conditions
- [ ] Unique constraints prevent duplicates
- [ ] Error handling if conflict occurs

---

### **5.4: Long Towing Service Name**

**Objective:** Verify base name extraction works

**Test Cases:**
| Input Name | Base Name Extracted | Wheel Lift Name | Flatbed Name |
|------------|---------------------|-----------------|--------------|
| "Local Tow - Wheel Lift" | "Local Tow" | "Local Tow - Wheel Lift" | "Local Tow - Flatbed" |
| "Emergency Tow Truck Service - Hook" | "Emergency Tow Truck Service" | "Emergency Tow Truck Service - Wheel Lift" | "Emergency Tow Truck Service - Flatbed" |
| "Towing" | "Towing" | "Towing - Wheel Lift" | "Towing - Flatbed" |

**Acceptance Criteria:**
- [ ] Base name extracted correctly
- [ ] No duplicate suffixes (" - Wheel Lift - Wheel Lift")
- [ ] Clean service names created

---

## TEST SUITE 6: Regression Tests

### **6.1: Non-Towing Services Still Work**

**Objective:** Verify non-towing services unaffected

**Test Services:**
- Jumpstart
- Tire Change
- Lockout
- Fuel Delivery
- Battery Replacement

**Expected:**
- ✅ All create normally (no flatbed dialog)
- ✅ Agent quotes correct prices
- ✅ No workflow issues

**Acceptance Criteria:**
- [ ] Non-towing services unaffected
- [ ] No regression in existing functionality

---

### **6.2: Other Business Modes Work**

**Objective:** Verify food/medical/service modes unaffected

**Test Steps:**
1. Test food mode: create menu item, make order call
2. Test service mode: create service, make booking call
3. Test medical mode: create appointment, make intake call

**Expected:**
- ✅ All modes work normally
- ✅ Correct workflow_config created for each mode
- ✅ No cross-contamination

**Acceptance Criteria:**
- [ ] Food mode unchanged
- [ ] Service mode unchanged
- [ ] Medical mode unchanged
- [ ] Each mode has correct workflow_config

---

### **6.3: Existing Customizations Preserved**

**Objective:** Verify migration doesn't overwrite custom values

**Test Setup:**
1. Find tenant with custom workflow_config (manually edited)
2. Run migration
3. Check if custom values preserved

**Expected:**
- ✅ Custom values NOT overwritten
- ✅ Only default values updated

**Acceptance Criteria:**
- [ ] Migration WHERE clause prevents overwriting customs
- [ ] Only tenants with original defaults get updated
- [ ] Custom configurations preserved

---

## TEST SUITE 7: Performance & Scale

### **7.1: Bulk Tenant Creation**

**Objective:** Verify trigger performs well at scale

**Test Setup:**
1. Create 100 test tenants simultaneously
2. Verify all get workflow_config created
3. Check execution time

**Expected:**
- ✅ All 100 tenants get workflow_config
- ✅ Execution completes in <10 seconds
- ✅ No timeouts or locks

**Acceptance Criteria:**
- [ ] 100% success rate
- [ ] Reasonable performance (<100ms per tenant)
- [ ] No database locks

---

### **7.2: Large Service Catalog**

**Objective:** Verify flatbed dialog works with many services

**Test Setup:**
1. Create tenant with 50+ services
2. Add new towing service
3. Verify dialog appears and works

**Expected:**
- ✅ Dialog appears
- ✅ Service creation works
- ✅ No performance issues

**Acceptance Criteria:**
- [ ] No slowdown with large catalogs
- [ ] UI remains responsive

---

## TEST SUITE 8: User Experience

### **8.1: Business Owner Onboarding**

**Objective:** End-to-end new user experience

**Test Steps:**
1. Sign up as new user
2. Choose "Towing Company"
3. Complete onboarding wizard
4. Go to Business Brain
5. Check Workflow Config tab
6. Create first towing service

**Expected:**
- ✅ Onboarding smooth (no errors)
- ✅ Workflow Config tab shows all settings
- ✅ All defaults populated
- ✅ Flatbed dialog appears when creating tow service
- ✅ First call works perfectly

**Acceptance Criteria:**
- [ ] Onboarding <10 minutes
- [ ] No confusion
- [ ] Settings visible and understandable
- [ ] First call successful

---

### **8.2: Business Owner Customization**

**Objective:** Verify Business Brain workflow customization works

**Test Steps:**
1. Go to Business Brain → Workflow Config
2. Change payment_timing to "upfront"
3. Change driver_callback_script to custom message
4. Save
5. Make test call
6. Verify agent uses new settings

**Expected:**
- ✅ Changes save successfully
- ✅ Agent uses new settings in next call
- ✅ Changes persist after page refresh

**Acceptance Criteria:**
- [ ] Settings editable
- [ ] Changes save
- [ ] Changes take effect (within 1 min cache)
- [ ] Agent uses custom values

---

## FINAL VALIDATION CHECKLIST

### **Pre-Deployment:**
- [ ] All database migrations tested in staging
- [ ] All frontend components tested locally
- [ ] All agent behaviors verified in test calls
- [ ] All edge cases handled gracefully
- [ ] No regressions in existing functionality
- [ ] Performance acceptable
- [ ] User experience smooth

### **Staging Deployment:**
- [ ] Migrations run successfully
- [ ] No database errors
- [ ] Frontend deploys without issues
- [ ] Agent prompts updated in ElevenLabs staging
- [ ] 10+ test calls made successfully
- [ ] Business Brain UI works
- [ ] No console errors

### **Production Deployment:**
- [ ] Staging validation complete
- [ ] Production migrations run
- [ ] Frontend deployed
- [ ] Agent prompts updated
- [ ] 5+ test calls made
- [ ] Monitoring in place
- [ ] Rollback plan ready

### **Post-Deployment Monitoring:**
- [ ] Monitor first 50 calls
- [ ] Watch for error rates
- [ ] Check customer satisfaction
- [ ] Collect business owner feedback
- [ ] Iterate based on findings

---

## Success Criteria

### **PHASE 6 Complete When:**
- ✅ All test suites pass (100% success rate)
- ✅ No critical bugs found
- ✅ Performance acceptable
- ✅ User experience validated
- ✅ Edge cases handled
- ✅ Documentation complete
- ✅ Deployment checklist ready

### **Definition of "1000% Complete":**
1. **Data Flow:** Database → Backend → Agent = 100% working
2. **Agent Behavior:** All 10 original problems fixed
3. **UI/UX:** Business Brain workflow config works perfectly
4. **Onboarding:** New signups work automatically
5. **Edge Cases:** All edge cases handled gracefully
6. **Performance:** Acceptable at scale
7. **Documentation:** Comprehensive and accurate
8. **Testing:** All test suites pass
9. **Deployment:** Ready for production
10. **Monitoring:** Metrics and alerts in place

---

## Timeline

**Testing Phases:**
1. Database Tests (Suite 1): 1 hour
2. Pipeline Tests (Suite 2): 1 hour
3. Frontend Tests (Suite 3): 1 hour
4. Agent Tests (Suite 4): 2 hours
5. Edge Case Tests (Suite 5): 1 hour
6. Regression Tests (Suite 6): 1 hour
7. Performance Tests (Suite 7): 30 minutes
8. UX Tests (Suite 8): 30 minutes

**Total Testing Time: 8 hours**

**Plus:**
- Staging deployment: 1 hour
- Production deployment: 1 hour
- Monitoring setup: 1 hour

**Grand Total: 11 hours (1.5 business days)**

---

## Next Steps

After PHASE 6 complete:
1. Create deployment runbook
2. Schedule deployment window
3. Notify stakeholders
4. Deploy to staging
5. Validate staging
6. Deploy to production
7. Monitor closely
8. Celebrate! 🎉

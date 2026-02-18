# Business Brain Regression Checklist

**Purpose:** Verify that Business Brain refactoring doesn't break existing functionality.
**Run:** After Phase 1 completion, and after EACH Phase 2 batch (max 5 files).

---

## Phase 1 Verification (Current)

### 1. Business Brain Page Loads
- [ ] Navigate to `/app/business-brain`
- [ ] Page renders without errors
- [ ] All 8 section buttons appear in sidebar
- [ ] Clicking each section switches content area
- [ ] No console errors

### 2. Section Navigation Works
- [ ] Click "Business Profile" → Profile section displays
- [ ] Click "Services & Pricing" → Services section displays
- [ ] Click "Service Area" → Service area section displays
- [ ] Click "Scheduling & Availability" → Scheduling section displays
- [ ] Click "Policies & Rules" → Policies section displays
- [ ] Click "FAQs & Knowledge" → FAQs section displays
- [ ] Click "Knowledge Assets" → Assets section displays
- [ ] Click "Review Queue" → Review queue section displays

### 3. Existing Functionality Unchanged
- [ ] Navigate to `/app/settings` → Settings page still loads
- [ ] Navigate to `/app/services` → Services page still loads and works
- [ ] Navigate to `/app/ai-assistant` → AI Assistant page still loads
- [ ] Navigate to `/app/simulator` → Simulator still works
- [ ] Make a test call → Twilio inbound still works
- [ ] Check dashboard → No errors loading

---

## Core Functionality Tests (Run After Each Batch)

### Scenario 1: Service Management
**Flow:** Owner adds/edits a service → AI knows about it
- [ ] Go to Services page
- [ ] Add a new service with name, price, duration
- [ ] Save successfully
- [ ] Go to Simulator
- [ ] Ask AI "What services do you offer?"
- [ ] AI mentions the new service
- [ ] Ask AI "How much is [service]?"
- [ ] AI provides correct price

**Expected:** Service appears in AI knowledge immediately

---

### Scenario 2: Pricing Rules
**Flow:** Owner configures pricing rule → AI uses it for quotes
- [ ] Go to Settings → Pricing & Estimates
- [ ] Create a distance-based pricing rule (towing: $50 + $8/mile)
- [ ] Save successfully
- [ ] Go to Simulator (call mode)
- [ ] Say "I need a tow truck"
- [ ] Provide pickup address: "123 Main St, Chicago"
- [ ] Provide dropoff address: "456 Oak Ave, Chicago"
- [ ] Say "It's about 5 miles"
- [ ] AI should quote: "$90" (50 + 5×8)

**Expected:** AI uses pricing rule for distance calculation

---

### Scenario 3: Required Questions
**Flow:** Owner sets required questions → AI collects them before booking
- [ ] Go to Settings → Required Questions
- [ ] For "booking" intent, add required field: "party_size"
- [ ] Save successfully
- [ ] Go to Simulator (call mode)
- [ ] Say "I'd like to make a reservation"
- [ ] AI should ask for party size before confirming
- [ ] Provide party size: "4 people"
- [ ] AI proceeds with booking

**Expected:** AI enforces required questions per intent

---

### Scenario 4: Business Hours
**Flow:** Owner updates hours → AI reflects new hours
- [ ] Go to Settings → Profile
- [ ] Change Monday hours to 10am-6pm
- [ ] Save successfully
- [ ] Go to Simulator
- [ ] Ask "What are your hours on Monday?"
- [ ] AI should say "10am to 6pm" (not old hours)

**Expected:** Hours update flows to AI context

---

### Scenario 5: FAQs
**Flow:** Owner adds FAQ → AI can answer it
- [ ] Go to AI Assistant page
- [ ] Add FAQ: "Do you offer senior discounts?" → "Yes, 10% off for seniors 65+"
- [ ] Save successfully
- [ ] Go to Simulator
- [ ] Ask "Do you have senior discounts?"
- [ ] AI should answer with the FAQ response

**Expected:** FAQ appears in AI knowledge base

---

### Scenario 6: Busyness-Based ETA
**Flow:** Owner sets busyness rules → AI adjusts ETA based on load
- [ ] Go to Settings → Pricing & Estimates → Busyness Rules
- [ ] Set base_prep_minutes: 30, busy_buffer_minutes: 15
- [ ] Set manual busyness: 50%
- [ ] Save successfully
- [ ] Go to Simulator
- [ ] Ask "How soon can you get here?"
- [ ] AI should quote ~38 minutes (30 + 50% × 15)

**Expected:** ETA calculation uses busyness formula

---

### Scenario 7: Dispatch Address Validation
**Flow:** AI enforces address specificity for dispatch
- [ ] Go to Simulator (call mode)
- [ ] Say "I need a tow"
- [ ] When AI asks for address, say "downtown"
- [ ] AI should re-ask: "I need a more specific address with street number..."
- [ ] Say "123 Main Street, Springfield"
- [ ] AI accepts and continues

**Expected:** AI rejects vague addresses for dispatch

---

### Scenario 8: Real Call Flow (Golden Path)
**Flow:** End-to-end call with booking
- [ ] Place actual call to Twilio number
- [ ] Say "I need a plumber"
- [ ] AI asks for details (address, issue, preferred time)
- [ ] Provide all details
- [ ] AI provides quote (if pricing configured)
- [ ] AI confirms booking
- [ ] Check Bookings page → new booking appears
- [ ] Check Inbox → conversation logged

**Expected:** Full golden path completes without errors

---

### Scenario 9: Knowledge Conflict Handling
**Flow:** Upload conflicts with existing data → shows in review queue
- [ ] Add a service: "Drain Cleaning - $149"
- [ ] Upload a PDF that mentions "Drain Cleaning - $175"
- [ ] Go to Business Brain → Review Queue tab
- [ ] Conflict should appear
- [ ] Resolve conflict (keep existing or accept upload)
- [ ] Service price matches resolution

**Expected:** Conflicts detected and resolvable

---

### Scenario 10: Multi-Mode Behavior
**Flow:** Business mode drives available features
- [ ] Switch to Food mode (if test tenant)
- [ ] Business Brain → Services section should mention "menu items"
- [ ] Navigate to Menu Center → menu editor works
- [ ] Switch to Service mode
- [ ] Business Brain → Services section should mention "services"
- [ ] Navigate to Services page → service editor works

**Expected:** UI adapts to business_mode

---

## Phase 2 Batch Verification

After each Phase 2 batch (max 5 files changed):

### Pre-Batch Checklist
- [ ] Note which 5 files are being modified
- [ ] Identify which core functionality tests apply to this batch
- [ ] Run those tests BEFORE making changes (baseline)

### Post-Batch Checklist
- [ ] Run the relevant core functionality tests
- [ ] Verify "Edit in Business Brain" CTAs work (redirect correctly)
- [ ] Verify read-only surfaces display data correctly
- [ ] Check for console errors
- [ ] Run git diff to confirm no accidental logic changes
- [ ] If any test fails, fix before proceeding to next batch

---

## Critical Non-Negotiables (Must Pass Every Time)

### Golden Path Still Works
- [ ] Twilio inbound → twilio-inbound → buildBusinessContext → ElevenLabs → conversation → handoff → booking created

### No Nulls to ElevenLabs
- [ ] Check dynamic_variables in buildBusinessContext
- [ ] All variables use `|| ""` or `|| "Not configured"` fallbacks
- [ ] No `null` or `undefined` values sent

### Business Mode + Enabled Modules Drive Behavior
- [ ] UI shows/hides features based on enabled_modules
- [ ] Industry is only used for templates/defaults
- [ ] Runtime behavior uses business_mode, not industry

### Customers Table Integrity
- [ ] Phone normalization to E.164 still works
- [ ] Unique constraint (tenant_id, phone_e164) enforced
- [ ] No duplicate customer records created

---

## Failure Response

If ANY test fails:
1. **STOP** - Do not proceed to next batch
2. **Investigate** - Find root cause
3. **Fix** - Restore functionality
4. **Re-test** - Run full checklist again
5. **Document** - Note what broke and how it was fixed
6. **Proceed** - Only after all tests pass

---

## Phase 2 Batch Plan (Proposed)

### Batch 1 (Highest Impact - Pricing)
- [ ] `PricingRulesEditor.tsx` → Move to Brain #services
- [ ] `BusynessRulesEditor.tsx` → Move to Brain #scheduling
- [ ] `SettingsPage.tsx` → Make pricing section read-only, add CTA

### Batch 2 (Service Management)
- [ ] `QuickAddServiceDialog.tsx` → Redirect to Brain #services
- [ ] `ServicesPage.tsx` → Make read-only or redirect
- [ ] `ServiceEditorAdvanced.tsx` → Move to Brain #services

### Batch 3 (Hours & Scheduling)
- [ ] `SettingsPage.tsx` hours section → Move to Brain #scheduling
- [ ] `AvailabilityHub.tsx` → Move to Brain #scheduling
- [ ] `BookingBehaviorSettings.tsx` → Move to Brain #scheduling

### Batch 4 (Policies & Rules)
- [ ] `RequiredQuestionsEditor.tsx` → Move to Brain #policies
- [ ] `AIBusinessPolicies.tsx` → Move to Brain #policies
- [ ] `PoliciesEditor.tsx` → Move to Brain #policies

### Batch 5 (FAQs & Knowledge)
- [ ] `QuickAddFAQDialog.tsx` → Redirect to Brain #faqs
- [ ] `QuickAddPolicyDialog.tsx` → Redirect to Brain #faqs
- [ ] `AIAssistantPage.tsx` FAQ section → Make read-only, add CTA

### Batch 6 (Delivery Settings)
- [ ] `BookingDeliverySettings.tsx` → Move to Brain #policies
- [ ] `DispatchDeliverySettings.tsx` → Move to Brain #policies
- [ ] `FoodOrderSettings.tsx` → Move to Brain #policies

### Batch 7 (Medical & HIPAA)
- [ ] `MedicalHIPAASettings.tsx` → Move to Brain #policies
- [ ] Medical intake forms → Review (may be operational, not knowledge)

### Batch 8 (Knowledge Assets)
- [ ] `KnowledgeUploadHub.tsx` → Move to Brain #assets
- [ ] `KnowledgeUploads` hooks → Route through writeBrainFact

### Batch 9 (Review Queue)
- [ ] `KnowledgeConflicts` hooks → Route through writeBrainFact
- [ ] `KnowledgeSuggestions` hooks → Route through writeBrainFact
- [ ] `KnowledgeMergeReview.tsx` → Move to Brain #review-queue

---

**Last Updated:** Phase 1 Complete
**Next:** Test Phase 1 with Scenarios 1-10 before proceeding to Batch 1

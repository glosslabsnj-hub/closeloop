# Business Brain Comprehensive Audit

**Created:** 2026-02-08  
**Purpose:** Document the complete state of the Business Brain, identify gaps, confusion points, and missing scenarios.

---

## Executive Summary

The Business Brain has grown organically to support 5 business modes (Service, Dispatch, Food, Medical, General) with ~60+ distinct configuration sections. However, the complexity has outpaced the UX clarity, leading to:

1. **Scattered settings** - Related configurations are spread across tabs
2. **Unclear dependencies** - It's not obvious when setting X affects setting Y
3. **Missing conditional logic** - Scenarios like "if catering enabled, show catering coverage" aren't fully wired
4. **Incomplete industry nuances** - Different businesses within the same mode have different needs
5. **Overwhelming options** - Too many sections, unclear what's essential vs optional

---

## Current Tab Structure

| Tab | Purpose | Modes Where Visible |
|-----|---------|---------------------|
| Profile | Business identity + templates | All |
| Hours | Operating hours | All |
| Services | What you offer + pricing | All |
| Coverage & ETA | Where you serve + travel times | All (conditional for Food) |
| Availability | Calendar sync | All |
| Policies | Rules, guardrails, notifications | All |
| AI Behavior | Scripts, guidelines, learning | All |
| Knowledge | FAQs, objections, documents | All |

---

## TAB-BY-TAB AUDIT

### 1. PROFILE TAB

**Current Sections:**
- ✅ Business Information (essential)
- ✅ Quick Start Templates (advanced)

**Issues:**
- [ ] No clear way to change business mode after setup
- [ ] Industry selection isn't prominent enough
- [ ] No "business personality" section (formal vs casual tone)

**Missing Settings:**
- [ ] Business personality/tone selector
- [ ] Timezone configuration (currently buried elsewhere)
- [ ] Multiple location management UI
- [ ] Branding/voice identity (beyond just name)

---

### 2. HOURS TAB

**Current Sections:**
- ✅ Operating Hours

**Issues:**
- [ ] No distinction between "phone hours" vs "service hours" vs "pickup hours"
- [ ] No holiday/exception handling visible
- [ ] No seasonal hours support

**Missing Settings:**
- [ ] Holiday closures manager
- [ ] Seasonal hours (summer vs winter)
- [ ] Different hours for different services (e.g., kitchen closes at 10pm, bar at 2am)
- [ ] Emergency/after-hours callback toggle
- [ ] Special event hours overrides

---

### 3. SERVICES TAB

**Current Sections:**
- ✅ Service Types (Food mode only) - NEW
- ✅ Pricing Rules (Service/General)
- ✅ Menu/Services/Tow Services Catalog
- ✅ Price Adjustments (Service/General)
- ✅ Packages & Bundles (Service/General)
- ✅ Dispatch Fees (Dispatch)
- ✅ Distance Pricing (Dispatch)
- ✅ Order Settings (Food)
- ✅ Size Options (Food)
- ✅ Specials & Deals (Food)
- ✅ Practice Pricing (Medical)
- ✅ Additional Services (All)

**Issues:**
- [ ] Food "Order Settings" appears in BOTH Services tab AND Policies tab (confusing duplication)
- [ ] No clear way to set up "free consultations" vs "paid services"
- [ ] Deposit requirements are buried
- [ ] Service duration configuration is unclear
- [ ] No package/bundle support for Food mode
- [ ] Minimum purchase requirements aren't obvious

**Missing Settings:**
- [ ] Service dependencies (e.g., "must book consultation before treatment")
- [ ] Deposit requirements per service
- [ ] Cancellation fees per service
- [ ] Package deals for restaurants (e.g., "dinner for 2")
- [ ] Loyalty/membership pricing
- [ ] Group/party rates
- [ ] Seasonal pricing variations
- [ ] "Add-on" services that can only be booked with a main service

---

### 4. COVERAGE & ETA TAB

**Current Sections:**
- ✅ Where You Serve (coverage area)
- ✅ Travel & Wait Times / Delivery Times / Catering Coverage
- ✅ Service Scheduling (Service mode)
- ✅ Coverage Zones & ETA (Dispatch)
- ✅ Delivery Zones (Food + delivery enabled)
- ✅ Catering Coverage (Food + catering enabled)
- ✅ Visit Options (Medical)
- ✅ Response Times (General)
- ✅ Current Workload

**Issues:**
- [ ] For Food mode, section is EMPTY if delivery/catering not enabled - confusing
- [ ] No clear connection between "Coverage" and "Services" (e.g., some services might have different coverage)
- [ ] "Workload" is in Coverage tab but affects scheduling/ETA globally
- [ ] Catering lead time requirements aren't in an obvious place

**Missing Settings:**
- [ ] Per-service coverage (e.g., "We deliver pizza but not catering")
- [ ] Per-service minimum lead time
- [ ] "Private events only at our location" vs "we travel for private events"
- [ ] Venue requirements for catering (power, water, kitchen access)
- [ ] Minimum order for delivery by zone
- [ ] Blackout dates/areas
- [ ] "We don't serve during rush hour" type restrictions

---

### 5. AVAILABILITY TAB

**Current Sections:**
- ✅ Calendar & Availability

**Issues:**
- [ ] Only shows calendar sync - but what about businesses that don't use calendars?
- [ ] No distinction between "appointment slots" vs "table availability" vs "event availability"
- [ ] No manual availability override without calendar

**Missing Settings:**
- [ ] Manual availability blocks (without calendar sync)
- [ ] Reservation slot configuration (for restaurants)
- [ ] Party size limits per time slot
- [ ] Table/resource management (e.g., "we have 10 tables")
- [ ] Staff availability (e.g., "only 2 stylists on Mondays")
- [ ] Equipment availability (e.g., "only 3 tow trucks")

---

### 6. POLICIES TAB

**Current Sections:**
- ✅ Business Policies
- ✅ AI Guardrails (Never Promise)
- ✅ Required Questions
- ✅ Custom Policies - NEW
- ✅ Booking Delivery (Service/Medical/General)
- ✅ Order Settings (Food) - DUPLICATE!
- ✅ Dispatch Settings (Dispatch)
- ✅ Distance Pricing (Dispatch) - DUPLICATE!
- ✅ Call Routing/IVR (Dispatch)
- ✅ Impound Lot Details (Dispatch)
- ✅ Impound Fees (Dispatch)
- ✅ Release Requirements (Dispatch)
- ✅ HIPAA Settings (Medical)

**Issues:**
- [ ] "Order Settings" (FoodOrderSettings) appears here AND in Services tab
- [ ] "Distance Pricing" (DistanceBasisSettings) appears here AND in Services tab
- [ ] Policies tab is MASSIVE for dispatch mode (9 sections!)
- [ ] No clear distinction between "policies AI should know" vs "operational settings"
- [ ] Required Questions editor is limited - can't create conditional questions

**Missing Settings:**
- [ ] Conditional required questions (e.g., "if booking for child, ask age")
- [ ] Payment policy editor (accepted methods, deposits, etc.)
- [ ] Refund policy configuration with amounts/timeframes
- [ ] Gratuity/tipping policy
- [ ] Allergy disclaimer (Food mode)
- [ ] Pet policy (Service mode for home services)
- [ ] Parking instructions
- [ ] COVID/health protocols
- [ ] Age restrictions per service
- [ ] Guest policies (e.g., "can I bring a friend?")

---

### 7. AI BEHAVIOR TAB

**Current Sections:**
- ✅ Service Call Flow Settings (Service/General only)
- ✅ Greeting & Scripts
- ✅ Business Guidelines
- ✅ Intelligence Settings

**Issues:**
- [ ] Call Flow Settings only visible for Service/General - Dispatch/Food need custom flows too
- [ ] No way to customize AI personality per scenario (e.g., more urgent for dispatch)
- [ ] "Business Guidelines" vs "Policies" distinction is unclear

**Missing Settings:**
- [ ] Call flow for Food mode (order-first vs inquiry-first)
- [ ] Call flow for Medical mode (symptom check vs scheduling)
- [ ] AI personality settings (warmth level, formality, humor)
- [ ] Hold/transfer scripts
- [ ] Voicemail scripts
- [ ] Follow-up call behavior
- [ ] Upselling behavior controls (how aggressive)
- [ ] Language/accent preferences
- [ ] Speaking pace adjustments

---

### 8. KNOWLEDGE TAB

**Current Sections:**
- ✅ Review Queue (with pending items)
- ✅ FAQs
- ✅ Objection Handling
- ✅ Menu Item Details (Food)
- ✅ Catering by Event Type (Food)
- ✅ Vehicle Requirements (Dispatch)
- ✅ Roadside Situations (Dispatch)
- ✅ Symptom Triage (Medical)
- ✅ Insurance Carrier Info (Medical)
- ✅ Product Knowledge (Service/General)
- ✅ Aftercare Instructions (All)
- ✅ Competitor Positioning (All)
- ✅ Seasonal & Events (All)
- ✅ Custom Knowledge (All)
- ✅ Documents (All)

**Issues:**
- [ ] Many editors are "empty shells" - placeholder components without real functionality
- [ ] No clear way to mark knowledge as "critical" vs "nice to have"
- [ ] Review Queue only shows for pending items - can't review approved items

**Missing Settings:**
- [ ] Staff/team member knowledge (e.g., "Ask for Sarah for color services")
- [ ] Location-specific knowledge (different FAQs per location)
- [ ] Time-sensitive knowledge (e.g., "construction on Main St this week")
- [ ] "Currently unavailable" items with reasons
- [ ] Supplier/vendor information
- [ ] Warranty/guarantee details
- [ ] Credential/certification info ("licensed and insured")

---

## CROSS-CUTTING ISSUES

### A. Settings Appear in Multiple Places
| Setting | Where it appears |
|---------|-----------------|
| Order Settings (FoodOrderSettings) | Services → Order Options, Policies → Delivery & Notifications |
| Distance Pricing (DistanceBasisSettings) | Services → Dispatch Pricing, Policies → Dispatch Operations |

**Fix:** Each setting should appear in ONE canonical location, with links from other relevant places.

### B. Mode-Specific Logic Gaps

**Food Mode:**
- "Service Types" (dine-in/pickup/delivery/catering) is foundational but was buried
- Catering has completely different requirements than regular orders
- Private events need venue/capacity information
- Reservations vs Orders are different flows

**Dispatch Mode:**
- Towing vs Roadside vs Impound are three different business lines
- Some tow companies don't do impound at all
- Motor clubs (AAA) have different flows

**Service Mode:**
- Some services are appointments (salon), some are estimates (contractor)
- Mobile services need travel time, in-shop services don't
- Some services require deposits, some don't

**Medical Mode:**
- Insurance verification is complex and varies by practice
- Telehealth vs in-person have different requirements
- New patient vs existing patient flows

**General Mode:**
- This is a catch-all with the least customization
- Many businesses here have unique needs

### C. Conditional Logic Needed

| Condition | Should Show/Hide |
|-----------|-----------------|
| accepts_catering = true | Catering Coverage section, Event Type Knowledge |
| accepts_delivery = true | Delivery Zones section, Delivery ETAs |
| has_impound_lot = true | Impound sections in Policies |
| offers_mobile_service = true | Travel time configuration |
| requires_deposits = true | Deposit policy editor |
| has_multiple_locations = true | Location-specific settings |

### D. Essential vs Advanced Confusion

Current "Essential" markers are inconsistent. Users don't know:
- What MUST be filled out for AI to work?
- What's optional but recommended?
- What's power-user only?

---

## RECOMMENDED CHANGES (PRIORITIZED)

### P0 - Critical (Do First)
1. **Remove duplicate settings** - Each setting in one place only
2. **Fix Food mode flow** - Service Types → Coverage → Menu should be clear
3. **Add clear "Required for AI" indicators** - What breaks if not filled?

### P1 - High Priority
4. **Add conditional question builder** - "If X, ask Y"
5. **Separate Catering from regular Food orders** - Different configuration needs
6. **Add Call Flow settings for all modes** - Not just Service
7. **Create "Quick Setup" wizard** - Walk users through essentials

### P2 - Medium Priority
8. **Add holiday/exception hours** - Common need
9. **Add per-service settings** - Duration, deposit, coverage
10. **Add reservation/table management** - Restaurant specific
11. **Consolidate Policies tab** - Too many sections for Dispatch

### P3 - Nice to Have
12. **Staff/team knowledge** - Who does what
13. **Multiple location support** - Per-location settings
14. **Seasonal variations** - Hours, pricing, menu

---

## NEXT STEPS

1. Review this audit with product owner
2. Prioritize based on user impact
3. Create implementation tasks
4. Execute in phases, testing with real businesses

---

## APPENDIX: All Current Components

```
Section Editors (60+ components):
- BusinessProfileEditor
- BusinessHoursManager
- ServiceCatalogEditor
- MenuCatalogEditor
- DispatchServiceCatalog
- PricingRulesEditor
- PriceModifiersEditor
- ServicePackagesEditor
- DispatchPricingEditor
- DistanceBasisSettings
- FoodServiceTypesEditor
- FoodSettingsEditor
- MenuSizesEditor
- DailySpecialsEditor
- MedicalPricingEditor
- AdditionalServicesEditor
- ServiceAreaManager
- DistanceEtaSection
- DispatchEtaSection
- ServiceCoverageEditor
- DispatchCoverageZonesEditor
- DeliveryZonesEditor
- MedicalCoverageEditor
- ResponseTimeEditor
- BusynessRulesEditor
- AvailabilityHub
- BusinessPoliciesEditor
- AINeverPromiseEditor
- RequiredQuestionsEditor
- CustomPoliciesEditor
- BookingDeliverySettings
- FoodOrderSettings
- DispatchDeliverySettings
- DispatchIvrSettings
- ImpoundLotEditor
- ImpoundFeesEditor
- ImpoundReleaseEditor
- MedicalHIPAASettings
- ServiceCallFlowSettings
- AIScriptsEditor
- AIBusinessPolicies
- IntelligenceSettingsForm
- BusinessFAQEditor
- BusinessObjectionEditor
- MenuKnowledgeEditor
- CateringKnowledgeEditor
- VehicleKnowledgeEditor
- RoadsideKnowledgeEditor
- SymptomTriageEditor
- InsuranceKnowledgeEditor
- ProductKnowledgeEditor
- AftercareInstructionsEditor
- CompetitorKnowledgeEditor
- SeasonalKnowledgeEditor
- CustomKnowledgeEditor
- BrainAssetsManager
- BrainReviewQueue
```


# Business Brain Refactor Plan
## Goal: True Customization Without Breaking ElevenLabs Logic

### Executive Summary

The Business Brain needs to evolve from a complex, scattered configuration system to a guided, scenario-aware setup that adapts to each business's unique needs. The core principle: **"If a business owner can't understand what to configure, the AI won't work well."**

This plan preserves all existing ElevenLabs integration logic (the `buildBusinessContext.ts`, `voiceContextContract.ts`, and `agentBasePrompts.ts` files that power the AI) while completely restructuring how business owners input their data.

---

### Current Architecture Analysis

**Data Flow (Must Not Break)**:
```text
Business Brain UI
       |
       v
Database Tables (tenants, services, assistant_settings, etc.)
       |
       v
getBusinessBrainSnapshot() - Fetches all tenant data
       |
       v
buildBusinessContext() - Normalizes into BusinessContext
       |
       v
voiceContextContract.ts - Creates dynamic variables
       |
       v
ElevenLabs Agent (voice) or SMS Handler
```

**Current Problems Identified**:
1. **60+ editors** scattered across 8 tabs with unclear relationships
2. **Duplicate settings** appear in multiple places (FoodOrderSettings, DistanceBasisSettings)
3. **No conditional logic** - sections show even when irrelevant
4. **Missing "Required for AI"** indicators - owners don't know what's essential
5. **Mode-specific nuances** not surfaced (e.g., catering vs regular orders are conflated)
6. **No guided setup flow** - owners are dropped into a complex UI

---

### Refactor Principles

1. **Scenario-Driven Configuration**
   - Instead of "configure these 60 settings," ask "What does your business do?"
   - Show only relevant sections based on answers

2. **Progressive Disclosure**
   - Essential settings visible first
   - Advanced settings hidden until needed
   - AI Preview always visible to show impact

3. **Zero Breaking Changes to AI Logic**
   - All database tables remain unchanged
   - All edge functions remain unchanged
   - Only the UI and data entry flow changes

4. **Validation Before Go-Live**
   - Clear checklist of what's required for AI to work
   - Warnings when essential data is missing

---

### Phase 1: Foundation (No UI Changes Yet)

**1.1 Create a Business Capabilities Discovery System**

New hook: `useBusinessCapabilities`
- Fetches and derives what the business actually does
- Returns booleans like:
  - `offersDelivery`, `offersCatering`, `offersPickup`, `offersDineIn` (food)
  - `offersTowing`, `offersRoadside`, `hasImpoundLot`, `offersMotorClub` (dispatch)
  - `offersMobileService`, `offersInShopService`, `offersSameDayEmergency` (service)
  - `offersAppointments`, `offersWalkIns`, `requiresDeposits` (all modes)
  - `hasTelehealth`, `hasNewPatientIntake`, `requiresInsurance` (medical)

This hook becomes the single source of truth for visibility logic.

**1.2 Create Essential Fields Registry**

New file: `src/config/essentialFields.ts`
```text
Defines per-mode which fields are:
- REQUIRED: AI will fail without this
- RECOMMENDED: AI works but less effective
- OPTIONAL: Nice to have
```

Used to:
- Show "Required" badges in UI
- Power the completion checklist
- Gate "Go Live" button

**1.3 Refactor useBrainSummaries**

Current: Hardcoded 4 essential checks
New: Dynamically calculates completion based on:
- Business mode
- Enabled capabilities
- Essential fields registry

---

### Phase 2: Consolidate Duplicate Settings

**2.1 Settings Location Matrix**

| Setting | Current Locations | Canonical Location |
|---------|------------------|-------------------|
| FoodOrderSettings | Services, Policies | Services only |
| DistanceBasisSettings | Services, Policies | Coverage & ETA only |
| Order Settings | Multiple | Services > Order Options |

**2.2 Create Redirect Links**

When a setting only appears in one place, add contextual links:
- "Looking for delivery settings? Go to Services"
- Small link, not duplicate editor

---

### Phase 3: Scenario-Based Section Visibility

**3.1 Food Mode Scenarios**

```text
On first visit to Business Brain (food mode):
- "What does [Business Name] offer?"
  [ ] Dine-in
  [ ] Pickup/Takeout
  [ ] Delivery
  [ ] Catering/Private Events
  [ ] Reservations

Based on answers:
- Delivery → Show Delivery Zones, Delivery ETAs, Delivery Minimum
- Catering → Show Catering Coverage, Event Types, Lead Time, Deposit %
- Reservations → Show Table Management, Party Size Limits
- None selected → Show simpler "Core Menu" focus
```

**3.2 Dispatch Mode Scenarios**

```text
- "What services does [Business Name] provide?"
  [ ] Towing (light-duty, medium, heavy)
  [ ] Roadside Assistance (jump, lockout, fuel, tire)
  [ ] Impound/Storage
  [ ] Motor Club/AAA calls

Based on answers:
- Towing → Show vehicle types, equipment fees, distance pricing
- Roadside → Show roadside service catalog, flat-rate pricing
- Impound → Show impound lot, storage rates, release requirements
- Motor Club → Show motor club rates, coverage limits
```

**3.3 Service Mode Scenarios**

```text
- "How do customers get your services?"
  [ ] Come to our location (salon, shop)
  [ ] We go to them (mobile, home service)
  [ ] Both

Based on answers:
- Mobile/Both → Show Service Area, Travel Times, On-site buffers
- Shop-only → Hide Service Area, show Walk-in availability
```

**3.4 Implementation Approach**

- Store scenario answers in `tenants.config_json` (no new tables)
- `useBusinessCapabilities` reads these flags
- BusinessBrainPage uses hook to show/hide sections

---

### Phase 4: AI Preview Integration

**4.1 Global AI Preview Panel**

Add a persistent "AI Preview" component that shows:
- What the AI will say based on current configuration
- Updates in real-time as owner makes changes

**4.2 Per-Section AI Impact**

Each section shows:
- "How AI uses this" - one sentence
- "Example response" - what AI might say
- "If not configured" - what happens without it

**4.3 Example for Policies Section**

```text
+--------------------------------------------+
| Cancellation Policy                        |
| [24-hour notice required      ]            |
|                                            |
| AI Preview:                                |
| "We do require 24 hours notice for         |
|  cancellations. If you need to reschedule, |
|  just let us know by tomorrow..."          |
+--------------------------------------------+
```

---

### Phase 5: Guided Setup Flow

**5.1 New Owner Onboarding**

When completion is < 30%, show a step-by-step wizard:

```text
Step 1: Business Identity
  - Name, address, phone, hours
  
Step 2: What You Offer
  - Scenario questions (see Phase 3)
  - Auto-populate relevant sections
  
Step 3: Your Services/Menu
  - Add at least 3 items
  - Pricing setup
  
Step 4: Policies
  - Cancellation, payment methods
  
Step 5: AI Greeting
  - Custom greeting script
  - Review AI voice sample
  
Step 6: Go Live Checklist
  - Validate all required fields
  - Test call option
```

**5.2 Quick Start Templates Enhancement**

Current templates apply generic settings.
Enhanced templates:
- Ask scenario questions for that industry
- Apply mode-specific defaults
- Pre-populate FAQs and objections

---

### Phase 6: Conditional Question Builder

**6.1 New Feature: "If X, Ask Y"**

Allow owners to create conditional intake logic:

```text
Example: Restaurant with delivery
- IF order_type = "delivery" THEN ask delivery_address
- IF party_size > 6 THEN ask special_occasion
- IF ordering_alcohol THEN ask date_of_birth

Example: Medical with new patients
- IF is_new_patient THEN ask insurance_provider, date_of_birth, reason_for_visit
- IF is_existing_patient THEN ask just reason_for_visit
```

**6.2 Implementation**

- Add `condition_json` to `intake_requirements` table
- UI: Simple rule builder (dropdown + dropdown + field)
- `buildBusinessContext` already handles `required_questions` with intent mapping

---

### Files to Modify

**New Files to Create:**
| File | Purpose |
|------|---------|
| `src/hooks/useBusinessCapabilities.ts` | Single source of truth for what business offers |
| `src/config/essentialFields.ts` | Required/Recommended/Optional field registry |
| `src/components/brain/setup/ScenarioWizard.tsx` | Initial scenario questions |
| `src/components/brain/setup/GuidedSetupFlow.tsx` | Step-by-step onboarding |
| `src/components/brain/AIPreviewPanel.tsx` | Global AI preview component |
| `src/components/brain/shared/ConditionalQuestionBuilder.tsx` | If X, Ask Y UI |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/pages/app/BusinessBrainPage.tsx` | Use new capabilities hook for visibility, integrate scenario wizard |
| `src/hooks/useBrainSummaries.ts` | Dynamic completion calculation based on capabilities |
| `src/components/brain/layout/SectionSummaryCard.tsx` | Add "Required for AI" badge support |
| `src/components/brain/layout/businessBrainNavConfig.ts` | Update visibility functions to use capabilities |
| `src/components/brain/food/FoodServiceTypesEditor.tsx` | Add scenario questions for food mode |
| `src/components/brain/dispatch/index.ts` | Add scenario questions for dispatch mode |
| `src/hooks/useFoodOrderSettings.ts` | Extend to derive more capability flags |

**Files That MUST NOT Change:**
| File | Reason |
|------|--------|
| `supabase/functions/_shared/buildBusinessContext.ts` | Core AI context builder |
| `supabase/functions/_shared/voiceContextContract.ts` | ElevenLabs variable contract |
| `supabase/functions/_shared/agentBasePrompts.ts` | Agent behavioral prompts |
| `supabase/functions/_shared/agentToolsConfig.ts` | Tool configurations |
| `supabase/functions/_shared/getBusinessBrainSnapshot.ts` | Database fetcher |
| All `supabase/functions/elevenlabs-*` | Handoff endpoints |

---

### Database Changes

**No new tables required**. Use existing columns:

| Table | Column | New Usage |
|-------|--------|-----------|
| `tenants` | `config_json` | Store scenario answers, capability flags |
| `intake_requirements` | `condition_json` | Already exists, use for conditional questions |

**Optional Enhancement:**
- Add `is_required` and `ai_impact` columns to existing settings tables for UI badges
- Can be done with migration, no schema changes to core tables

---

### Testing Strategy

1. **Golden Path Tests**
   - For each mode, verify that completing the guided setup results in a working AI
   - Test: Scenario → Fill required → Go Live → Test Call

2. **Regression Tests**
   - Existing tenants with data must continue working
   - No changes to what AI says unless owner changes settings

3. **Edge Cases**
   - Business changes mode after setup (rare but possible)
   - Business enables/disables capabilities after going live

---

### Implementation Order

| Phase | Priority | Estimated Effort |
|-------|----------|-----------------|
| 1.1 useBusinessCapabilities | P0 | 1 session |
| 1.2 Essential Fields Registry | P0 | 1 session |
| 2.1-2.2 Remove duplicates | P0 | 1 session |
| 3.1-3.4 Scenario visibility | P0 | 2 sessions |
| 4.1-4.3 AI Preview | P1 | 2 sessions |
| 5.1-5.2 Guided setup | P1 | 2 sessions |
| 6.1-6.2 Conditional questions | P2 | 2 sessions |

---

### Success Criteria

1. **Owner can set up a new business in under 10 minutes** (currently 30+)
2. **Zero confusion about what affects the AI** (Required badges visible)
3. **No "empty shell" sections** (only show what's relevant)
4. **AI works the same as before** (regression tests pass)
5. **Completion percentage accurately reflects AI readiness**

---

### Technical Notes

**Why This Approach is Safe:**

The ElevenLabs integration is a read-only consumer of database state. It doesn't care how the data got into the database, only that it's there. By changing the UI layer while preserving:
- Database schema
- `buildBusinessContext()` logic
- Dynamic variable contracts
- Agent prompts and tools

We guarantee the AI behavior remains unchanged while dramatically improving the setup experience.

**Key Invariants to Preserve:**
- `tenants.business_mode` determines agent type
- `tenants.enabled_modules` determines which tools are available
- `services` table is source of truth for offerings
- `assistant_settings` stores go-live status and voice preferences
- All queries remain tenant-scoped with RLS


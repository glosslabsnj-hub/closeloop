

## Business Brain Complete Audit & Reorganization Plan

### Executive Summary

After a thorough audit of the Business Brain page and comparing it to the `buildBusinessContext.ts` / `getBusinessBrainSnapshot.ts` data contract (what the AI actually receives), I've identified several usability issues and missing capabilities that prevent businesses from inputting all the information their AI needs.

---

### Current State Analysis

The Business Brain currently has **9 tabs**:

| Tab | Current Components | Issues |
|-----|-------------------|--------|
| **Profile** | BusinessProfileEditor, IndustryTemplateCard | Missing: Business Hours editor, AI Never Promise, Website URL, Years in Business |
| **Services & Pricing** | QuoteReadinessCard, PricingRulesEditor, ServiceCatalogEditor | Good for service-mode; Missing: Menu Items for food-mode (redirects to separate page) |
| **Service Area** | ServiceAreaPreview, ServiceAreaManager, DistanceEtaSection | Good structure |
| **Scheduling** | BusynessRulesEditor, AvailabilityHub | Missing: Hours editor! Only shows availability/blocks, not actual operating hours |
| **Policies** | RequiredQuestionsEditor, AIBusinessPolicies, 4x mode-specific delivery settings, BusinessPoliciesEditor | Overcrowded - 7 components in one tab, confusing |
| **FAQs** | BusinessFAQEditor, BusinessObjectionEditor | Good structure |
| **Assets** | BrainAssetsManager | Good structure |
| **AI Intelligence** | IntelligenceSettingsForm | Good structure |
| **Review Queue** | BrainReviewQueue | Good structure |

---

### Critical Gaps Identified

#### 1. **Missing Business Hours Editor in Business Brain**
The `hours_json` field is critical for the AI (used for "Are you open?", scheduling, etc.) but there's no way to edit it in Business Brain! The only hours editor exists in the onboarding flow. The Scheduling tab shows AvailabilityHub (calendar blocks) but not actual business hours.

#### 2. **Missing "AI Never Promise" Editor**
The `ai_never_promise` field (things the AI should never promise) exists in the database and is read by the context builder, but there's no UI to edit it in Business Brain. It's only captured during onboarding.

#### 3. **Missing Website URL Field**
`website_url` is part of the Business Brain snapshot but not editable in BusinessProfileEditor.

#### 4. **Missing Years in Business Field**
`years_in_business` is in the context but not editable.

#### 5. **Menu Items Not in Business Brain**
For food-mode businesses, menu items are managed in a completely separate page (`/app/menu-center`) instead of being integrated into Business Brain's "Services & Pricing" tab.

#### 6. **Policies Tab is Overloaded**
The Policies tab has 7 different components crammed together:
- RequiredQuestionsEditor (intake questions)
- AIBusinessPolicies (upsell, pricing, capacity rules)
- BookingDeliverySettings
- FoodOrderSettings
- DispatchDeliverySettings
- MedicalHIPAASettings
- BusinessPoliciesEditor (cancellation, deposit, refund)

Many of these are mode-specific but all show regardless of mode, creating confusion.

#### 7. **Greeting/Fallback Scripts Not Editable**
The AI has `greeting_script` and `fallback_script` fields in `assistant_settings` but there's no UI to customize what the AI says when greeting callers or when it doesn't understand.

---

### Proposed Reorganization

#### New Tab Structure (8 tabs, better organized)

```
BUSINESS BRAIN TABS (Reorganized)

1. PROFILE & IDENTITY
   - Business name, tagline, public phone
   - Address (street, city, state, zip)
   - Website URL (NEW)
   - Years in Business (NEW)
   - Timezone
   - Industry Template Card
   - Service Area Preview (quick glance)

2. OPERATING HOURS
   - Full BusinessHoursEditor (MOVED from onboarding)
   - AI preview: "What the AI tells callers about your hours"
   - Link to Availability/Blocks for exceptions

3. SERVICES & MENU (Mode-aware)
   - For service/dispatch/medical/general: ServiceCatalogEditor
   - For food mode: Integrated MenuItemEditor (MOVED from /menu-center)
   - PricingRulesEditor (for all modes)
   - QuoteReadinessCard

4. SERVICE AREA & ETA
   - ServiceAreaManager
   - DistanceEtaSection
   - ServiceAreaPreview
   (Unchanged - good structure)

5. AVAILABILITY & SCHEDULING
   - AvailabilityHub (calendar connections, blocks)
   - BusynessRulesEditor
   - Note: "Operating hours are set in the Hours tab"

6. POLICIES & RULES
   - BusinessPoliciesEditor (cancellation, deposit, refund, payment methods)
   - AI Never Promise Editor (NEW)
   - RequiredQuestionsEditor (what AI must collect)
   - Mode-specific settings (only show relevant ones):
     - BookingDeliverySettings (service, medical, general)
     - FoodOrderSettings (food only)
     - DispatchDeliverySettings (dispatch only)
     - MedicalHIPAASettings (medical only)

7. AI BEHAVIOR
   - AIBusinessPolicies (upsell, pricing, capacity, recognition, escalation)
   - Greeting/Fallback Scripts (NEW)
   - IntelligenceSettingsForm (memory, thresholds)

8. KNOWLEDGE & TRAINING
   - BusinessFAQEditor
   - BusinessObjectionEditor
   - BrainAssetsManager (uploads)
   - BrainReviewQueue (with badge count)
```

---

### Implementation Steps

#### Phase 1: Add Missing Editors

**Step 1.1: Add Hours Editor to Business Brain**
- Create `src/components/brain/BusinessHoursManager.tsx`
- Reuse the existing `BusinessHoursEditor` component from onboarding
- Add preview card showing "What AI will say about hours today"
- Save to `tenants.hours_json`

**Step 1.2: Add AI Never Promise Editor**
- Create `src/components/brain/AINeverPromiseEditor.tsx`
- Simple textarea with line-by-line entries
- Save to `tenants.ai_never_promise` array

**Step 1.3: Add Website URL & Years in Business to Profile**
- Update `BusinessProfileEditor.tsx` to include:
  - Website URL field
  - Years in Business (number input)

**Step 1.4: Add Greeting/Fallback Script Editor**
- Create `src/components/brain/AIScriptsEditor.tsx`
- Fields for:
  - Custom greeting (what AI says first)
  - Fallback script (when AI doesn't understand)
- Save to `assistant_settings` table

#### Phase 2: Reorganize Tabs

**Step 2.1: Create new tab structure in BusinessBrainPage.tsx**
- Rename "Scheduling & Availability" to just "Availability"
- Create new "Operating Hours" tab
- Create new "AI Behavior" tab
- Merge FAQs/Objections/Assets into "Knowledge & Training"

**Step 2.2: Make Policies tab mode-aware**
- Only show BookingDeliverySettings for service/medical/general modes
- Only show FoodOrderSettings for food mode
- Only show DispatchDeliverySettings for dispatch mode
- Only show MedicalHIPAASettings for medical mode

**Step 2.3: Integrate Menu Editor for food mode**
- In "Services & Menu" tab, conditionally render:
  - ServiceCatalogEditor for non-food modes
  - Embedded MenuItemEditor for food mode (inline, not separate page)

#### Phase 3: UX Improvements

**Step 3.1: Add AI Preview Cards**
- Each section should show "What the AI will say" preview
- Hours: "We're open today from 9 AM to 5 PM"
- Service Area: "We serve within 25 miles of Springfield"
- Policies: "Our cancellation policy requires 24 hours notice"

**Step 3.2: Add Progress/Readiness Indicators**
- Show completion status for each section
- Highlight missing critical fields
- Link to the canonical readiness score

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/brain/BusinessHoursManager.tsx` | Hours editing with AI preview |
| `src/components/brain/AINeverPromiseEditor.tsx` | Things AI should never promise |
| `src/components/brain/AIScriptsEditor.tsx` | Greeting and fallback scripts |
| `src/components/brain/MenuCatalogEditor.tsx` | Inline menu editor for food mode |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/app/BusinessBrainPage.tsx` | New tab structure, mode-aware rendering |
| `src/components/brain/BusinessProfileEditor.tsx` | Add website URL, years in business |
| `src/lib/brain/writeBrainFact.ts` | Add update functions for new fields |

---

### Technical Notes

1. **No DB changes required** - All fields already exist in the schema
2. **No new ElevenLabs variables** - All fields are already part of the existing context contract
3. **Mode-aware rendering** - Use `useTenantConfig().businessMode` to conditionally show components
4. **AI Preview Pattern** - Reuse `ServiceAreaPreview` pattern for other sections

---

### Before/After Comparison

**Before (Current State):**
```
Profile → Missing: hours, website, years, never-promise
Services → OK for service mode, food mode uses separate page
Service Area → Good
Scheduling → Missing actual hours editor!
Policies → 7 components crammed together, not mode-aware
FAQs → Good
Assets → Good
AI Intelligence → Missing greeting/fallback scripts
Review Queue → Good
```

**After (Proposed):**
```
Profile & Identity → Complete business identity
Operating Hours → Dedicated hours management with AI preview
Services & Menu → Mode-aware (services OR menu)
Service Area & ETA → Unchanged
Availability → Calendar blocks and busyness (hours moved out)
Policies & Rules → Organized, mode-aware delivery settings
AI Behavior → All AI customization in one place
Knowledge & Training → FAQs + Objections + Uploads + Review Queue
```

This reorganization ensures every piece of information the AI needs has a clear, intuitive place to be entered, with visual feedback showing what the AI will actually say.


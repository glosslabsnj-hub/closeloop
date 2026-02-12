
# The Game Plan: End-to-End Setup That Actually Works

**STATUS: Phase 0 ✅ DONE | Phase 1.1-1.3 ✅ DONE | Phase 2-5 TODO**

---

## Phase 0: Critical Fixes (Day 1 -- Stop the Bleeding)

These are things that are actively broken or will make a business owner close the tab.

### 0.1 Discovery Scroll Indicator
Users don't realize there are more questions below the fold. The ScrollArea is 460px with no visual cue.
- Add a bottom gradient fade + "Scroll for more" indicator that disappears after scrolling
- File: `ScenarioDiscovery.tsx`

### 0.2 Booking Mode Clarification
"Should the AI book appointments directly?" sounds like it guarantees appointments. Users who want approval-based booking don't know they can get that.
- Change the description to: "If yes, you'll choose whether bookings are instant or need your approval in the next step."
- File: `scenarioQuestions.ts` (one-line text change)

### 0.3 Hide Busyness Slider for Non-Dispatch
A detailing shop sees a "busyness slider" that controls dispatch ETAs. Makes no sense.
- Gate `BusynessSliderWidget` to only render when `caps.derivedPrimaryMode === "dispatch"`
- File: `LiveDashboard.tsx`

### 0.4 Services Paste -- Price Type Detection
When pasting services from Square, "starting at $X" gets imported as fixed "$X". The AI extraction prompt doesn't detect qualifiers.
- Update `process-knowledge` edge function prompt to detect "starting at", "from", "varies", "and up" and set `price_type: "starting_at"`
- File: `supabase/functions/process-knowledge/index.ts`

### 0.5 Services Paste -- Review Queue Discoverability
After pasting text, a toast appears and disappears. User has no idea where their data went.
- Replace the transient toast with a persistent banner that links to the Review Queue
- Add a badge count on the Knowledge tab when items are pending review
- File: `InlineUploadButton.tsx`

---

## Phase 1: Onboarding Flow Improvements (Week 1)

### 1.1 Make Discovery Answers Actionable
Right now many discovery toggles set capability flags but never surface a follow-up. For example: "Do you charge a trip fee?" = YES, but there's nowhere to enter the dollar amount.

**Solution**: After onboarding completes, for each YES answer that requires configuration, inject a specific setup task into the post-onboarding checklist.

| Capability Flag | Follow-Up Task |
|-----------------|---------------|
| `chargesTripFee` | "Set your trip fee amount" -> Price Modifiers editor |
| `hasMinimumCharge` | "Set your minimum service charge" -> Price Modifiers editor |
| `requiresDeposits` | "Configure your deposit policy" -> Policies section |
| `offersMobileService` | "Set your service area radius" -> Coverage section |
| `hasMultipleStaff` | "Add your team members" -> Team section |

- Files: `setupStepBuilder.ts`, `SetupProgressChecklist.tsx`

### 1.2 Smarter Service Preview Step
The current service preview only shows name/duration/price in a flat list. No way to set "starting at" pricing during onboarding.
- Add a price type toggle (Fixed / Starting At / Quote Only) visible inline for each service
- Show the price type that came from the template (many detailing services are "starting at")
- File: `ServicePreviewStep.tsx`

### 1.3 Communication Preferences -- Approval Mode Messaging
The "Require Approval" booking mode description says "AI collects the request; you confirm each one manually." This doesn't explain the customer experience.
- Update to: "The AI finds an open time but tells the caller 'someone will reach out to confirm.' You approve or adjust before it's final."
- File: `CommunicationPreferences.tsx`

---

## Phase 2: Post-Onboarding Dashboard (Week 1-2)

### 2.1 Guided Setup Overlay (Replace SetupWizard)
The current `SetupWizard` is a 3-step (Phone, Configure AI, Go Live) modal that's disconnected from actual business needs. Replace it with a contextual, inline checklist that lives on the dashboard and adapts to what the business actually needs.

The `SetupProgressChecklist` already exists and is mode-aware (using `buildSetupSteps`). Promote it to the primary setup experience:
- Make it the hero section of the dashboard until all critical steps are done
- Add estimated time per step ("~2 min", "~5 min")
- Add inline completion actions (don't just link to another page -- let users do simple things right there)
- Files: `LiveDashboard.tsx`, `SetupProgressChecklist.tsx`, `setupStepBuilder.ts`

### 2.2 Customer-to-Job Flow
Users can't create a job from an existing customer. The New Job dialog has free-text fields only.
- Add a customer search combobox to `NewJobDialog.tsx`
- When a customer is selected, auto-fill name/phone and show their vehicles in a dropdown
- Store `customer_id` and `vehicle_id` on the job
- Files: New `CustomerSearchCombobox.tsx`, modified `NewJobDialog.tsx`

### 2.3 Staff/Team Visibility
Users who said "I have multiple staff" see nothing in the dashboard or Brain about managing workers.
- Enable the "Team" section in Business Brain for service-mode tenants with `hasMultipleStaff`
- Add an "Assigned To" dropdown in `JobDetailSheet.tsx`
- Files: `businessBrainNavConfig.ts`, `JobDetailSheet.tsx`, `NewJobDialog.tsx`

---

## Phase 3: Service Import That Actually Works (Week 2)

### 3.1 Direct "Paste from POS" Dialog
The current paste flow sends text to the knowledge review queue. For services, this is the wrong path -- businesses want instant results.

Build a new `PasteFromPOSDialog` accessible from the Service Catalog:
1. User pastes text from Square/Clover/Toast
2. AI parses it into a preview table (name, duration, price, price type)
3. User reviews and confirms
4. Services are created directly in the `services` table -- no review queue
- Files: New `PasteFromPOSDialog.tsx`, new edge function `parse-services-text`, modified `ServiceCatalogEditor.tsx`

### 3.2 CSV Import for Services
Similar to the customer CSV import, add a CSV import option:
- Columns: Name, Description, Duration, Price, Price Type
- Preview table before import
- File: New `ServiceCSVImportDialog.tsx`

---

## Phase 4: Onboarding Polish (Week 2-3)

### 4.1 Progress Persistence
If a user closes the tab mid-onboarding and comes back, they start over. All state is in React useState.
- Save onboarding progress to localStorage after each step
- Restore on mount if no tenant exists yet
- File: `OnboardingPage.tsx`

### 4.2 Contextual Help Throughout
Many questions in Discovery and Scheduling lack context. A detailing business owner doesn't know what "buffer between appointments" means.
- Add expandable "Why this matters" tooltips to key questions
- Use industry-specific examples: "For a full detail that takes 3+ hours, a 30-minute buffer gives you time to inspect and prep for the next car."
- Files: `ScenarioDiscovery.tsx`, `SchedulingSetup.tsx`

### 4.3 Smart Defaults Based on Industry
The scheduling step shows the same defaults regardless of industry. A detailing business should default to 2-hour appointments with 30-minute buffers, not 60-minute with 15-minute buffers.
- Create an `industrySchedulingDefaults` map keyed by industry slug
- Pre-populate duration, buffer, and same-day booking based on the specific industry
- Files: `SchedulingSetup.tsx`, new config in `industryOnboardingConfig.ts`

---

## Phase 5: Business Brain Usability (Week 3)

### 5.1 "What Should I Do Next?" Engine
After onboarding, users land in the Business Brain and don't know where to start. The Brain has 20+ sections.
- Build a priority-ordered task queue based on:
  - Which capability flags are ON but unconfigured
  - Which AI readiness checks are failing
  - Which sections have zero data
- Show as a persistent "Next Steps" sidebar or top bar
- Files: `NextStepSuggestion.tsx`, `BrainSetupBanner.tsx`

### 5.2 Section-Level Completion Indicators
Every Brain section should show a completion indicator so users can see at a glance what's done and what's not.
- The `SectionSummaryCard` component exists but isn't used consistently
- Wire it into every section header with real data
- Files: Various Brain section components

### 5.3 Inline Quick-Add for Common Items
Instead of navigating to a full editor, let users add services, FAQs, and policies from a quick-add dialog right on the dashboard.
- The components `QuickAddServiceDialog`, `QuickAddFAQDialog`, `QuickAddPolicyDialog` already exist
- Surface them more prominently in the setup checklist
- Files: `SetupProgressChecklist.tsx`

---

## Execution Priority

```text
Priority  | Phase | Impact | Effort
----------|-------|--------|-------
P0        | 0.1   | High   | 30 min  (scroll indicator)
P0        | 0.2   | High   | 5 min   (text change)
P0        | 0.3   | High   | 5 min   (one conditional)
P0        | 0.4   | Medium | 1 hr    (prompt update)
P0        | 0.5   | High   | 1 hr    (persistent notification)
P1        | 1.1   | High   | 2 hrs   (actionable follow-ups)
P1        | 1.2   | High   | 1 hr    (price type in preview)
P1        | 1.3   | Medium | 5 min   (text change)
P1        | 2.1   | High   | 3 hrs   (promote checklist)
P1        | 2.2   | High   | 2 hrs   (customer search in jobs)
P1        | 2.3   | High   | 2 hrs   (team visibility)
P2        | 3.1   | High   | 4 hrs   (paste-to-catalog)
P2        | 3.2   | Medium | 2 hrs   (CSV import)
P2        | 4.1   | Medium | 2 hrs   (progress persistence)
P2        | 4.2   | Medium | 2 hrs   (contextual help)
P2        | 4.3   | Medium | 1 hr    (industry defaults)
P3        | 5.1   | High   | 3 hrs   (next steps engine)
P3        | 5.2   | Medium | 2 hrs   (completion indicators)
P3        | 5.3   | Low    | 1 hr    (quick-add surfacing)
```

---

## Recommended Starting Point

I would start by implementing **all of Phase 0** (the critical fixes) plus **Phase 1.1-1.3** in one batch. These are mostly small changes that dramatically improve the experience. Total effort: roughly 5-6 hours of implementation.

Then move to Phase 2 (dashboard + jobs + team), which is the biggest impact for post-onboarding retention.

Phase 3 (service import) and Phase 4 (onboarding polish) can run in parallel.

Phase 5 is the long-term quality-of-life layer.

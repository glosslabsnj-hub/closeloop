# PRODUCT QUALITY MANDATE - READ BEFORE EVERY SESSION

**Owner**: Jack Angelini
**Last updated**: 2026-02-28
**Priority**: P0 - THIS OVERRIDES ALL OTHER WORK

---

## THE STANDARD

This application must be **production-ready and marketable**. Every feature must work end-to-end. Every question in the UI must make sense for the specific business using it. Every flow must complete without errors. If something doesn't work, it doesn't ship.

**Jack's exact words**: "I need to know that these sessions are doing deep, deep work that is strategic and makes sense, and has a purpose behind it. They must be extremely smart when working on this project."

---

## SESSION RULES

### Before writing ANY code:
1. **Run the app locally** (`npm run dev`) and manually test the flow you're about to change
2. **Think like a customer** - would a plumber, dentist, or restaurant owner understand this screen?
3. **Check if the feature ACTUALLY WORKS end-to-end** - not just "does it compile"
4. **Read this document** and check the known issues list below

### Quality gates for every change:
- Does this question/feature make sense for ALL 6 business modes?
- Would a non-technical small business owner understand this without explanation?
- Is there any redundancy with other parts of the flow?
- Does the happy path complete without errors?
- Does the error path give a helpful message?
- Is the data actually saved and retrievable?

### What "done" means:
- NOT "the component renders"
- NOT "the build passes"
- NOT "I added the feature"
- YES "I tested this as a real user and it works perfectly from start to finish"

---

## KNOWN CRITICAL ISSUES (Fix these FIRST)

### 1. ONBOARDING - Broken and Unintelligent

**Status**: SUBSTANTIALLY FIXED (2026-02-28) — Industry intelligence layer shipped (commits c3c268c + af2ca4f + phase-2 suppressions)

**Problems identified by Jack**:

#### a) Stupid/obvious questions for specific industries — FIXED 2026-02-28
- ~~Asks a plumber "Do you offer mobile or on-site services?" - plumbers ALWAYS go on-site~~
  → Work style now AUTO-DETECTED for home_services, beauty_wellness, health_medical, food_hospitality, etc.
  → Shows "Auto-detected: You travel to your customers" badge + "Change" escape hatch for edge cases
- ~~Asks a plumber "Do customers leave items with you for an extended period?" - that's for repair shops~~
  → `suppressedFor` field added to ScenarioQuestion: job-tracking suppressed for home_services, beauty_wellness, food_hospitality, dispatch_logistics, health_medical, fitness_recreation, professional_services, events_entertainment, property_real_estate
  → "Mobile / On-Site Service" question also suppressed for all industries where it's obvious
  → "Same-Day / Emergency" suppressed for beauty_wellness, fitness_recreation, events_entertainment (no emergency concept for salons/gyms/photographers)
  → "Walk-Ins Welcome" suppressed for events_entertainment, property_real_estate (appointment-only by nature)

**Also fixed this session**:
- walk-ins `defaultValue` changed from `true` → `false` (was silently telling AI plumbers accept walk-ins)
- ModeAwareQuestions wired into Phase 1 via optional scenario props — plumbers now see relevant toggles (emergency, deposits, etc.) immediately after selecting industry

**Also fixed 2026-02-28 (session 2)**:
- ~~Industry-native terminology~~ → DONE across all 5 phases:
  - industryTerminology.ts: Added `getBookingActionPhrase()`, `getAutoBookSummary()`, `getReadinessVerb()` helpers
  - Phase 3: medical mode says "When do you see patients?"
  - Phase 4: "When someone wants to..." uses dynamic verb (schedule a job / book an appointment / make a reservation)
  - Phase 5: bookingSummary, readiness text, SMS tooltip all use appointmentLabel
  - AIPreviewPanel: 15 industry-specific caller messages (plumber: "I've got a leak under my kitchen sink")
  - ServicePreviewStep: "pricing varies" instead of "the job"
  - SchedulingSetup: labels use appointmentLabel (Default Job Duration / Default Appointment Duration)

**Still remaining**:
- More industries may need additional custom scenario question sets

#### b) Redundant questions — VERIFIED CLEAN (2026-02-28)
- `getDefaultAnswers()` now respects `preAnsweredFor` so pre-answered questions use the correct industry default
- `BusinessDetailsForm.teamSize` is NOT shown during onboarding (it's in state but never rendered)
- `staff-scheduling` is the ONLY place team size is asked — no actual duplicate in current flow
- Full audit confirmed: no duplicates across phases. Team size only asked via staff-scheduling follow-up.

#### c) Questions without purpose — VERIFIED (2026-02-28)
- All `onboardingVisible: true` questions now have `suppressedFor` to hide where irrelevant
- ModeAwareQuestions re-integrated into Phase 1 — shows 2-5 focused questions per industry
- Questions that are suppressed still get their `defaultValue` applied silently
- 4 non-onboarding questions identified as cosmetic-only (reminders, stylist-preference, warranty-check) — they lack `onboardingVisible` so they never appear during onboarding. Only in Brain.
- `long-duration-jobs` IS used — controls scheduling duration/buffer defaults in SchedulingSetup

#### d) Onboarding must be deeply industry-specific — DONE (2026-02-28)
- Industry-specific headings, placeholders, service lists: DONE (UX Pass 1-5)
- Smart defaults via preAnsweredFor + industryOnboardingConfig: DONE
- Work style auto-detection: DONE (2026-02-28)
- Terminology across all phases: DONE (2026-02-28) — plumber sees "schedule a job", salon sees "book an appointment"
- Phase 1 now shows only industry-relevant questions: DONE (2026-02-28)
- AIPreviewPanel shows industry-specific caller messages: DONE (2026-02-28)

### 2. TENANT CREATION FAILS

**Root cause**: Missing RLS SELECT policies on `user_roles` and `tenant_users` tables.
**Fixed**: 2026-02-28 - Added policies via Supabase Management API. Migration file: `20260228080000_fix_missing_rls_policies.sql`

**Verification needed**: Test complete onboarding flow end-to-end after fix. Both quick and full onboarding paths.

### 3. SUPER ADMIN FLOW

**Problem**: Super admin users were being redirected to onboarding instead of admin dashboard.
**Root cause**: Same RLS issue - app couldn't read `user_roles` to detect super_admin status.
**Fixed**: 2026-02-28

**What super admin needs to do**:
- Login -> redirect to /admin/dashboard (NOT onboarding)
- Create test tenants for any industry from admin panel
- Switch between tenants to test different service modes
- See all tenants, all data, all analytics
- Test every flow as if they were a customer of each business type

---

## PRODUCT VISION

### What the onboarding SHOULD be:

1. **Industry selection** - Pick your business type (with smart search)
2. **Business basics** - Name, address, phone, hours (pre-fill from Google/website if possible)
3. **Industry-specific deep questions** - ONLY questions that genuinely vary for that industry:
   - Plumber: Emergency calls? Service area radius? Specialties (drain, water heater, gas)?
   - Restaurant: Dine-in/takeout/delivery? Cuisine type? Reservation system?
   - Dental: Insurance accepted? Emergency appointments? Specialties?
4. **Services & pricing** - Pre-populated with industry defaults, user customizes
5. **AI personality** - Tone, greeting style, escalation rules
6. **Review & activate** - Summary, test call, go live

### What the dashboard SHOULD be:

- Tailored to exactly what the business needs
- A plumber doesn't see "menu management" or "reservation" tabs
- A restaurant doesn't see "dispatch" or "service area" tabs
- Every widget, tab, and feature is relevant to their specific business
- Zero clutter, zero confusion

### Integration philosophy:

- Customers can integrate with whatever tools they already use
- Google Calendar, Outlook, Square, QuickBooks, etc.
- Integration setup should be dead simple (OAuth flow, not manual API keys)
- The app should feel like it was built specifically for their business

---

## DEV SESSION CHECKLIST

Every receptionist_dev session must:

1. [ ] Read this document
2. [ ] Read the receptionist CLAUDE.md for current status
3. [ ] Run `npm run build && npm run test` to verify baseline
4. [ ] Pick the HIGHEST PRIORITY issue from the list above
5. [ ] Fix it completely (not partially)
6. [ ] Test it manually as a real user would
7. [ ] Update this document with what was fixed and what's still broken
8. [ ] Commit changes with descriptive message
9. [ ] Update the priority work queue in CLAUDE.md

**DO NOT**:
- Add new features when core flows are broken
- Fix cosmetic issues when functional issues exist
- Write code without testing it
- Mark something as "done" without verifying it works end-to-end
- Skip reading this document

---

## INDUSTRY INTELLIGENCE REQUIREMENTS

For the onboarding to be "smart", we need an industry intelligence layer that knows:

| Industry | Work Style | Team Structure | Common Services | Irrelevant Questions |
|----------|-----------|----------------|-----------------|---------------------|
| Plumbing | Always on-site/mobile | Solo or small crew | Drain cleaning, water heater, pipe repair, emergency | "Do customers leave items?", "Fixed location?" |
| HVAC | Always on-site/mobile | Technician teams | Install, repair, maintenance, emergency | "Do customers leave items?", "Fixed location?" |
| Dental | Fixed location | Staff + dentists | Cleaning, filling, crown, emergency, cosmetic | "Mobile services?", "Dispatch?" |
| Restaurant | Fixed location | Kitchen + front | Dine-in, takeout, delivery, catering | "On-site services?", "Service area?" |
| Auto Detailing | Mobile OR fixed | Solo or small crew | Wash, detail, ceramic, PPF | None - genuinely varies |
| Salon | Fixed location | Stylists | Cut, color, treatment, extensions | "Mobile?", "Dispatch?" |
| Cleaning | Always mobile | Teams | Residential, commercial, deep clean, move-out | "Fixed location?" |
| Electrical | Always on-site | Solo or crew | Wiring, panel, outlet, emergency, inspection | "Do customers leave items?" |

This table should be codified in the industry catalog and used to:
1. Skip irrelevant onboarding questions
2. Pre-fill obvious defaults
3. Use correct terminology
4. Show only relevant dashboard features



# Comprehensive Lead Finder & Agency Experience Upgrade

## Current State

The lead finder system (both agency and admin) works but has significant gaps:

1. **Data quality from Perplexity is inconsistent** -- fields like `website`, `address`, `phone`, `hours`, and `employee_estimate` are often returned as `null` because the AI prompt doesn't emphasize them enough and there's no post-processing to fill gaps.
2. **No "missed calls" or responsiveness data** -- the prompt asks for "friction signals" like `poor_responsiveness` but doesn't specifically request estimated missed call volume or responsiveness metrics.
3. **The lead card and detail panel show data when present** but don't surface enough actionable intelligence (no Google Maps link, no "call script" suggestion, no outreach tips).
4. **Agency sidebar links all point to `/app/agency`** -- there are no dedicated sub-routes for Clients, Lead Finder, Saved Leads, Commissions, or Reports. This causes the duplicate key React warning in console.
5. **No sales scripts, outreach tips, or onboarding guidance** for agencies to help them convert leads into clients.

---

## Implementation Plan

### Phase 1: Supercharge the Perplexity Prompts (Edge Functions)

**Files:** `supabase/functions/admin-lead-search/index.ts`, `supabase/functions/agency-lead-search/index.ts`, `supabase/functions/reseller-lead-search/index.ts`

Rewrite the system prompt and user prompt to demand richer, more structured data:

- **New fields requested from Perplexity:**
  - `email` (business contact email if findable)
  - `google_maps_url` (direct link)
  - `social_media` (object with `facebook`, `instagram`, `yelp` URLs)
  - `years_in_business` (estimated)
  - `owner_name` (if findable from website/LinkedIn)
  - `estimated_monthly_calls` (based on industry/reviews/size)
  - `estimated_missed_call_pct` (based on team size, hours, responsiveness signals)
  - `tech_stack_signals` (list: "no_crm", "no_voicemail", "uses_answering_service", "no_mobile_app", "manual_scheduling")
  - `pain_points` (2-3 specific pain points based on review analysis)
  - `best_contact_method` ("phone" | "email" | "walk_in" | "social_dm")
  - `best_contact_time` (e.g., "Tuesday-Thursday 10am-2pm")

- **Enhanced prompt structure:**
  - Instruct the AI to analyze Google reviews for phone-related complaints
  - Instruct the AI to estimate call volume based on industry benchmarks (e.g., "A towing company with 100+ reviews in a metro area likely receives 15-30 calls/day")
  - Instruct the AI to estimate missed call percentage based on team size and hours

### Phase 2: Update Data Types and UI Components

**Files:**
- `src/components/agency/lead-finder/LeadDetailPanel.tsx` -- Add new data sections
- `src/components/agency/lead-finder/leadScoring.ts` -- Factor in new signals
- `src/components/agency/lead-finder/leadConstants.ts` -- Add new signal labels
- `src/components/agency/AgencyLeadFinder.tsx` -- Show richer card data
- `src/components/admin/AdminLeadFinder.tsx` -- Same enrichments

**LeadDetailPanel enhancements:**
- **New "Call Intelligence" section** showing estimated monthly calls, estimated missed call %, best contact time
- **New "Digital Presence" section** with clickable links to website, Google Maps, social media profiles
- **New "Owner Intel" section** showing owner name and years in business when available
- **New "Pain Points" section** with specific review-based complaints
- **New "Outreach Script" section** -- a pre-written, customizable cold call script tailored to the lead's industry and pain points (generated client-side from template + lead data, no AI call needed)
- **New "Onboarding Checklist"** -- when an agency saves a lead, show a checklist: "Called lead", "Sent follow-up email", "Demo scheduled", "Contract signed", "Account provisioned"

**Lead card enhancements:**
- Show estimated missed calls per week as a prominent badge (e.g., "~12 missed/week")
- Show website as a clickable truncated link directly on the card
- Show best contact method icon

### Phase 3: Agency Sidebar with Dedicated Routes

**Files:**
- `src/components/layouts/AppSidebar.tsx` -- Fix duplicate keys, add unique routes
- `src/App.tsx` -- Add new routes
- New pages: `src/pages/app/agency/AgencyClientsPage.tsx`, `src/pages/app/agency/AgencyLeadFinderPage.tsx`, `src/pages/app/agency/AgencySavedLeadsPage.tsx`, `src/pages/app/agency/AgencyCommissionsPage.tsx`, `src/pages/app/agency/AgencyReportsPage.tsx`

**Route structure:**
- `/app/agency` -- Dashboard (overview, KPIs, welcome banner)
- `/app/agency/clients` -- Managed clients list + "Switch into Client" flow
- `/app/agency/leads` -- Lead Finder (search tab)
- `/app/agency/leads/saved` -- Saved Leads pipeline
- `/app/agency/commissions` -- Commission history and projections
- `/app/agency/reports` -- Performance reports (calls, conversions, revenue)
- `/app/agency/scripts` -- Sales scripts and onboarding playbook

This fixes the React duplicate key warning and makes each sidebar item functional.

### Phase 4: Sales Scripts & Onboarding Playbook

**File:** New `src/components/agency/AgencySalesPlaybook.tsx`, new page `src/pages/app/agency/AgencyScriptsPage.tsx`

Provide agencies with ready-to-use resources:

- **Cold Call Script** -- templated per industry, fills in the lead's name, pain points, and estimated missed calls
- **Follow-Up Email Template** -- professional email template referencing their specific business
- **Objection Handling Guide** -- common objections ("We're happy with our current system", "We don't miss that many calls", "It's too expensive") with proven responses
- **Onboarding Checklist** -- step-by-step guide for agencies to onboard a new client (provision account, configure AI, test call, go live)
- **ROI Calculator snippet** -- "If you miss X calls/week at $Y average job value, that's $Z/month in lost revenue. CloseLoop pays for itself in [N] days."

These are static/templated content (no AI needed) that dynamically insert lead-specific data when viewing from a saved lead context.

### Phase 5: Admin Lead Finder Parity

**Files:** Mirror all agency improvements into admin versions:
- `src/components/admin/AdminLeadFinder.tsx` -- same card/detail enrichments
- `src/components/admin/AdminSavedLeadsTab.tsx` -- same pipeline improvements
- `src/components/admin/ResellerLeadFinder.tsx` -- partner-specific enhancements (client base size, partnership fit score)

### Phase 6: Scoring Engine Enhancement

**File:** `src/components/agency/lead-finder/leadScoring.ts`

Add new scoring factors:
- `estimated_missed_call_pct` > 20% = +12 points
- `no_crm` tech signal = +8 points
- `uses_answering_service` = +10 points (they're already paying for call coverage, easy sell)
- `years_in_business` > 5 = +5 points (established, can afford it)
- `owner_name` found = +3 points (personalized outreach possible)

---

## Technical Notes

- The Perplexity prompt changes are the highest-impact fix. The data fields already exist in the UI components (phone, website, address are rendered when present) -- they're just often null because the prompt doesn't push hard enough for them.
- New fields like `estimated_monthly_calls` and `estimated_missed_call_pct` are AI estimates, not exact data. They'll be clearly labeled as estimates in the UI.
- The sales scripts are static templates with dynamic variable interpolation -- no additional API calls or costs.
- All new routes use the existing `AppLayout` wrapper; the `isAgencyOnly` check in `AppLayout.tsx` already handles agency users correctly.
- The duplicate key warning is caused by multiple sidebar items sharing `/app/agency` as their href (used as the React key). Giving each a unique route fixes this.

## Estimated Scope
- 3 edge functions modified (prompts rewritten)
- ~8 existing component files updated  
- ~7 new page/component files created
- No database schema changes needed (lead data is stored as JSON in existing columns)


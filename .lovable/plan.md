
# Business Brain Tab-by-Tab UX Polish

## What's Wrong Today

After reviewing every tab in the Business Brain, here are the core UX issues:

1. **Dashboard hub** still shows "KNOWLEDGE BASE" uppercase micro-label above "Business Brain" -- this is jargon and adds visual noise
2. **Section detail headers** are cluttered: uppercase micro-label ("AI BEHAVIOR, RULES & KNOWLEDGE") + big title + progress bar + "Complete" badge -- too many competing elements for a minimalistic design
3. **Sidebar labels truncate** badly -- "How Your AI Answer...", "What Your AI Shoul...", "Cancellation, Depos...", "Info to Collect on Ev..." -- these are unusable
4. **Sidebar group headers** use ALL CAPS tiny text ("HOW YOUR AI ACTS", "BUSINESS RULES") -- feels aggressive
5. **Content panel** shows icon + title + status badge + status text -- the status badge and text are redundant (the sidebar already shows status dots)
6. **"AI Uses This To..." callout boxes** appear inside SectionSummaryCard with violet backgrounds -- these add visual weight and are rarely read
7. **Category cards on dashboard** have left-border color accents that feel decorative
8. **Banner content** (progress indicators, setup banners, next step suggestions) stack up at the top of certain tabs creating walls of callouts before the user reaches the actual form
9. **The "Almost there! 3/4" progress banner** inside the "Your Business" tab is redundant with the progress bar already shown in the header

---

## Design Principles for the Fix

- **Labels should never truncate** -- shorten the titles themselves
- **One status indicator per item** -- not three (sidebar dot + badge + text)
- **Remove uppercase micro-labels** -- use normal case, smaller text
- **Strip callout boxes** -- guidance text goes inline as helper text under form fields, not as separate colored boxes
- **Flat, breathing layout** -- more whitespace, less visual layering

---

## Phase 1: Shorten Sidebar Item Titles

The #1 readability issue. These titles are too long for a 224px sidebar:

| Current Title | New Title |
|---|---|
| About Your Business | Business Info |
| Calendar & Availability | Calendar |
| Quick Setup Templates | Templates |
| How Your AI Answers the Phone | Greeting Script |
| Cancellation, Deposits & Payments | Policies |
| What Your AI Should Never Promise | Guardrails |
| Info to Collect on Every Call | Required Info |
| Other Rules for Your AI | Custom Rules |
| Special Instructions for Your AI | AI Guidelines |
| Common Questions & Answers | FAQs |
| When Customers Push Back | Objections |
| Items Needing Your Approval | Review Queue |
| Product & Material Knowledge | Product Knowledge |
| How Busy Are You Right Now? | Current Workload |
| Where to Send New Bookings | Booking Alerts |
| Callback Request Alerts | Callback Alerts |
| Extra Fees & Surcharges | Price Modifiers |
| Other Things You Offer | Additional Services |
| Your Service Area | Service Area |
| How You Charge for Distance | Distance Pricing |
| Extra Info for Your AI | Custom Knowledge |
| Reference Documents | Documents |
| Arrival Estimates | ETAs |
| AI Behavior Mode | AI Mode |

**File:** `src/config/brainSectionRegistry.ts` -- update `title` field on ~25 items

---

## Phase 2: Clean Up Section Detail Header

Currently the header shows:
```
<- Business Brain / [icon] Train Your AI
AI BEHAVIOR, RULES & KNOWLEDGE          (uppercase micro-label)
Train Your AI                           (big h1 title)
[============================] 57%      (progress bar)
```

Simplify to:
```
<- Business Brain / Train Your AI
[============================] 57%
```

Changes:
- Remove the uppercase `category.description` micro-label from `BrainSectionDetail.tsx`
- Remove the icon from the breadcrumb (just text)
- Move progress bar inline with the breadcrumb row (compact)
- Remove the "Complete" badge (the 100% bar is enough)

**File:** `src/components/brain/dashboard/BrainSectionDetail.tsx`

---

## Phase 3: Simplify Content Panel Header

Currently shows: icon + title + "Done"/"Set up" badge + status text below.

Simplify to: title only + small helper text. The sidebar already shows the status dot.

**File:** `src/components/brain/layout/BrainContentPanel.tsx`
- Remove the icon from the header
- Remove the status badge
- Keep just the title (h2) and a brief description line

---

## Phase 4: Clean Up Sidebar Group Headers

Change from aggressive ALL CAPS to normal case with lighter styling.

**File:** `src/components/brain/layout/BrainSectionSidebar.tsx`
- Change `text-[11px] font-semibold uppercase tracking-wider` to `text-xs font-medium text-muted-foreground` (no uppercase)

**File:** `src/components/brain/layout/BrainMobileItemList.tsx`
- Same change for mobile group headers

---

## Phase 5: Clean Up Dashboard Hub

Remove visual noise from the dashboard landing:
- Remove "KNOWLEDGE BASE" uppercase label from `BrainDashboard.tsx`
- Remove decorative left-border color from category cards in `BrainCategoryCard.tsx` (use simple hover:bg-muted/30 instead)
- Simplify the "essential items" count text to just show the percentage

**Files:** `src/components/brain/dashboard/BrainDashboard.tsx`, `src/components/brain/dashboard/BrainCategoryCard.tsx`

---

## Phase 6: Remove Stacking Banner Content

The `buildBannerContent()` in BusinessBrainPage can stack up to 4 banners on the "about" tab: CompletionCelebration + BrainSetupBanner + BrainProgressIndicator + NextStepSuggestion. This creates walls of callouts.

Simplify:
- Remove `BrainProgressIndicator` from banner content (the header progress bar is enough)
- Remove `NextStepSuggestion` from banner content (the dashboard hub already has BrainNextStepsBar)
- Keep only `CompletionCelebration` (shown once at 100%) and `BrainSetupBanner` (shown for new users under 50%)

**File:** `src/pages/app/BusinessBrainPage.tsx` -- simplify `buildBannerContent()`

---

## Phase 7: Remove "AI Uses This To..." Callout from SectionSummaryCard

The violet "Your AI uses this to..." callout box in `SectionSummaryCard` adds visual weight to every expanded section in the Intelligence dashboard. Remove it -- the information is not actionable.

Also remove the blue "guidance" callout box for incomplete items. Instead, just show helper text directly below form fields where needed (this is already handled by the individual editors).

**File:** `src/components/brain/layout/SectionSummaryCard.tsx`
- Remove the `usedByAI` rendering block
- Remove the guidance callout block
- Keep the clean expand/collapse with just the editor children

---

## Phase 8: Widen the Sidebar Slightly

The sidebar is 224px (`w-56`) which causes truncation. Widen to 256px (`w-64`) to accommodate the shorter (but still meaningful) titles.

**File:** `src/components/brain/layout/BrainSectionSidebar.tsx` -- change `w-56` to `w-64`

---

## Summary

| Phase | Files | What Changes |
|-------|-------|--------------|
| 1 | `brainSectionRegistry.ts` | Shorten ~25 sidebar item titles |
| 2 | `BrainSectionDetail.tsx` | Remove uppercase label, icon, complete badge |
| 3 | `BrainContentPanel.tsx` | Remove icon and status badge |
| 4 | `BrainSectionSidebar.tsx`, `BrainMobileItemList.tsx` | Normal case group headers |
| 5 | `BrainDashboard.tsx`, `BrainCategoryCard.tsx` | Remove jargon label, simplify cards |
| 6 | `BusinessBrainPage.tsx` | Remove stacking banners |
| 7 | `SectionSummaryCard.tsx` | Remove callout boxes |
| 8 | `BrainSectionSidebar.tsx` | Widen sidebar to 256px |

## What Will NOT Change
- All editor components and their forms
- All data hooks and save logic
- Business Brain content sent to ElevenLabs
- Database schema
- Edge functions
- Mode-awareness and capability gating
- The 5-tab structure and item groupings

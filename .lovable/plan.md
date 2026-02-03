
# UX Audit & Micro-Tweaks Plan

## Executive Summary

This plan delivers UI/UX polish across all major areas of CloseLoop without modifying any functional behavior, business logic, database schema, edge functions, readiness evaluator logic, or ElevenLabs dynamic variables.

**Scope**: Copy/microcopy, labels, helper text, tooltips, empty states, visual hierarchy, spacing, and a UI-only setup checklist.

---

## Methodology

I audited these 7 key areas:
1. **Dashboard** (LiveDashboard, DashboardHeroCard, TodaySnapshot, QuickActionsCard)
2. **Business Brain** (all 8 tabs)
3. **Unified Inbox** (Inbox, Calls, Leads tabs)
4. **Integrations** (Quick Automations, Connect, History)
5. **Simulator** (Call Simulator, SMS Simulator, AI Brain Debugger)
6. **Settings** (Team, Plan, Alerts, Integrations, Developer)
7. **AI Readiness UI** (AIReadinessPanel, GoLiveChecklist, ReadinessFixCenterPage)

---

## Findings & Micro-Tweaks by Area

### 1. Dashboard

**Friction Points Identified:**
- "Today's Snapshot" metric labels are technical ("AI Ready" percentage without context)
- "Needs Attention" banner has a generic button label ("View [type]")
- Quick Actions lack guidance text for new users
- LiveActivityFeed empty state is sparse

**Micro-Tweaks:**
| Component | Change | Rationale |
|-----------|--------|-----------|
| `TodaySnapshot.tsx` | Change "AI Ready" label to "Knowledge Score" with tooltip explaining what it means | More intuitive for non-technical users |
| `NeedsAttentionBanner.tsx` | Add helper text: "These items need your attention to keep your business running smoothly" | Clarifies urgency |
| `QuickActionsCard.tsx` | Add section subtitle: "Common tasks you can do right now" | Reduces cognitive load |
| `LiveActivityFeed.tsx` | Improve empty state: "Your AI hasn't handled any calls or bookings yet. Test it in the Simulator to see it in action." with a link to `/app/simulator` | Actionable guidance |
| `DashboardHeroCard.tsx` | Add tooltip on "Today's Busyness" slider explaining how it affects AI behavior | Demystifies the control |

### 2. Business Brain

**Friction Points Identified:**
- Some section descriptions use technical language
- Empty states on ServiceCatalogEditor could be more helpful
- Policies tab has many components without clear separation
- "Knowledge & Training" tab description mentions "objection responses" (sales jargon)

**Micro-Tweaks:**
| Component | Change | Rationale |
|-----------|--------|-----------|
| `BusinessBrainPage.tsx` | Update "Policies & Rules" description to: "Your business policies and what questions the AI must ask" | Plain English |
| `BusinessBrainPage.tsx` | Update "Knowledge & Training" description to: "FAQs, customer concerns, uploaded documents, and items to review" | Removes "objection responses" jargon |
| `BusinessBrainPage.tsx` | Add visual section dividers between component groups in Policies tab | Better visual organization |
| `AvailabilityHub.tsx` (if exists) | Add helper card: "Connect your calendar so the AI knows when you're busy" | Clear call to action |
| `BrainReviewQueue` section | Add helper text when count=0: "When you upload documents or add knowledge, items that need approval will appear here" | Explains the feature |

### 3. Unified Inbox (Inbox, Calls, Leads)

**Friction Points Identified:**
- Tab labels on mobile only show icons (no text)
- InboxPage empty state is good but lacks next-step guidance
- CallsPage info banner for pending calls is helpful but could be clearer
- LeadsPage has a non-functional "Add Lead" button with no action

**Micro-Tweaks:**
| Component | Change | Rationale |
|-----------|--------|-----------|
| `UnifiedInboxPage.tsx` | Ensure tab labels are always visible (remove `hidden sm:inline` class) | Better mobile UX |
| `InboxPage.tsx` | Add actionable CTA to empty state: "Make a test call to see it appear here" linking to simulator | Reduces confusion |
| `CallsPage.tsx` | Update info banner text from "Some calls are awaiting AI summary" to "Some recent calls are still being processed. Summaries appear after calls end." | Clearer language |
| `LeadsPage.tsx` | Disable the "Add Lead" button with tooltip: "Leads are automatically captured from calls and messages" or wire up a simple manual add modal | Prevents dead-end clicks |
| All three pages | Add consistent header helper text explaining what each tab shows | Improves discoverability |

### 4. Integrations

**Friction Points Identified:**
- Quick Automations section subtitle is helpful but tab descriptions are sparse
- "Connect" tab tool descriptions could be more actionable
- "History" tab lacks explanation of what it shows

**Micro-Tweaks:**
| Component | Change | Rationale |
|-----------|--------|-----------|
| `IntegrationsPage.tsx` | Add header helper for "Connect" tab: "Link your existing tools so data flows automatically" | Context setting |
| `IntegrationsPage.tsx` | Add header helper for "History" tab: "See a log of every automation that ran and whether it succeeded" | Explains the tab |
| Automation preset cards | Add subtle tooltip on each explaining the trigger: "Runs when a booking is created" | Helps users understand automation triggers |
| Advanced webhook section | Add helper text: "Most users don't need this. Scroll up for one-click automations." | Prevents overwhelm |

### 5. Simulator

**Friction Points Identified:**
- Page header is brief; users may not understand the relationship between tabs
- Tab guidance box is helpful but dense
- "Customer Conflicts" tab name is confusing

**Micro-Tweaks:**
| Component | Change | Rationale |
|-----------|--------|-----------|
| `SimulatorPage.tsx` | Rename "Customer Conflicts" tab to "Duplicate Contacts" | More understandable |
| `SimulatorPage.tsx` | Simplify tab guidance: Split into two lines for readability | Less overwhelming |
| `SimulatorPage.tsx` | Add "Debug Pages" helper: "Advanced tools for technical troubleshooting" | Sets expectations |
| Each simulator tab | Add a one-line description below the tab content area if empty | Reduces confusion |

### 6. Settings

**Friction Points Identified:**
- Section descriptions are helpful but some are technical
- "Developer Tools" section could scare non-technical users
- "Danger Zone" could use softer language

**Micro-Tweaks:**
| Component | Change | Rationale |
|-----------|--------|-----------|
| `SettingsPage.tsx` | Update "Developer Tools" description to: "Advanced debugging tools. Most users won't need this." | Reduces intimidation |
| `SettingsPage.tsx` | Add "(Optional)" label to Developer nav item | Signals it's not required |
| `SettingsPage.tsx` | Soften "Danger Zone" heading to "Account Access" or add helper: "These actions are reversible" | Less scary |
| BusinessBrainCTA banner | Ensure the banner is prominent and explains: "Looking to update what your AI knows? Go to Business Brain" | Reduces Settings/Brain confusion |

### 7. AI Readiness UI

**Friction Points Identified:**
- "P0" and "P1" terminology is internal jargon
- ReadinessFixCenterPage is well-structured but could use more encouragement
- GoLiveChecklist "Fix X Issues First" button feels negative

**Micro-Tweaks:**
| Component | Change | Rationale |
|-----------|--------|-----------|
| `AIReadinessPanel.tsx` | Change "Must Fix to Go Live" heading to "Required to Go Live" | Softer language |
| `AIReadinessPanel.tsx` | Change "Recommended Improvements" to "Optional Improvements" | Clearer priority |
| `GoLiveChecklist.tsx` | Change disabled button text from "Fix X Issues First" to "Complete X Steps to Go Live" | More encouraging |
| `ReadinessFixCenterPage.tsx` | Add encouragement message at top: "You're almost there! Complete these items to launch your AI." | Positive framing |
| All readiness components | Replace any remaining "P0/P1" visible text with user-friendly labels | No internal jargon exposed |

---

## UI-Only Setup Checklist Addition

Add a lightweight visual checklist component to the Dashboard that summarizes key setup milestones with links to existing routes. This does NOT add new logic; it visually maps existing completion states.

**New Component: `SetupProgressChecklist.tsx`**

| Step | Route Link | Completion Check (existing state) |
|------|------------|-----------------------------------|
| Add your services | `/app/business-brain` | services count > 0 |
| Set your hours | `/app/business-brain?section=hours` | hours_json not empty |
| Add FAQs | `/app/business-brain?section=knowledge` | faqs count > 0 |
| Connect phone | `/app/settings` | phone_connected flag |
| Test AI | `/app/simulator` | setup_step_tested flag |
| Go live | `/app/go-live` | go_live_enabled flag |

This reads existing state from AuthContext and displays a progress checklist with links. No new DB fields, no new edge functions.

---

## Files to Modify

| File | Type of Changes |
|------|-----------------|
| `src/components/dashboard/TodaySnapshot.tsx` | Label/tooltip improvements |
| `src/components/dashboard/NeedsAttentionBanner.tsx` | Helper text |
| `src/components/dashboard/QuickActionsCard.tsx` | Section subtitle |
| `src/components/dashboard/LiveActivityFeed.tsx` | Empty state enhancement |
| `src/components/dashboard/DashboardHeroCard.tsx` | Tooltip on slider |
| `src/components/dashboard/GoLiveChecklist.tsx` | Button text improvement |
| `src/components/dashboard/AIReadinessPanel.tsx` | Heading text updates |
| `src/pages/app/BusinessBrainPage.tsx` | Description text updates, section dividers |
| `src/pages/app/UnifiedInboxPage.tsx` | Tab label visibility |
| `src/pages/app/InboxPage.tsx` | Empty state CTA |
| `src/pages/app/CallsPage.tsx` | Banner text clarity |
| `src/pages/app/LeadsPage.tsx` | Button state/tooltip |
| `src/pages/app/IntegrationsPage.tsx` | Tab header helpers |
| `src/pages/app/SimulatorPage.tsx` | Tab renaming, helper text |
| `src/pages/app/SettingsPage.tsx` | Description softening |
| `src/pages/app/ReadinessFixCenterPage.tsx` | Encouragement message |

**New File:**
| `src/components/dashboard/SetupProgressChecklist.tsx` | UI-only checklist with links |

---

## 5-Minute Manual Test Checklist

After implementation, verify the following:

1. **Dashboard Functionality Unchanged**
   - Toggle AI Agent on/off - works as before
   - Busyness slider saves correctly
   - All metric cards navigate to correct pages
   - Needs Attention banner items link correctly

2. **Business Brain Data Flow Unchanged**
   - Edit and save a service - persists correctly
   - Edit and save FAQs - persists correctly
   - All tabs load their respective editors
   - Review queue shows correct counts

3. **Unified Inbox Tabs Work**
   - Switch between Inbox/Calls/Leads - content loads
   - URL query param updates correctly
   - Empty states display (if no data)

4. **Integrations Automations Work**
   - Toggle an automation on/off - saves
   - Test button fires correctly (if connected)

5. **Simulator Functions**
   - All tabs render without error
   - Simulator can be used to test AI

6. **Settings Pages Load**
   - All sections render correctly
   - Sign out works

7. **Readiness/Go-Live Flow**
   - AIReadinessPanel shows correct score
   - GoLiveChecklist links navigate to fix pages
   - ReadinessFixCenterPage displays issues

8. **ElevenLabs Payload Unchanged**
   - No changes to `buildBusinessContext.ts`
   - No changes to edge functions
   - No changes to dynamic variable registry
   - AI context debugger in Simulator shows identical payload before/after

---

## Summary

This plan delivers 30+ micro-improvements across 16 files that:
- Clarify "what to do next" at every step
- Add helpful empty states with actionable CTAs
- Replace technical jargon with plain English
- Improve visual hierarchy without changing layout structure
- Add a UI-only setup checklist for guidance

**Zero functional changes. Zero database changes. Zero ElevenLabs payload changes.**

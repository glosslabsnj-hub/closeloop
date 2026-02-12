

# Inbox-to-Leads Redesign

Now that the backend is creating leads for all call outcomes and tenant routing is fixed, here's what changes on the Lovable side.

## Changes Summary

### 1. Sidebar: "Inbox" becomes "Leads"
- In `AppSidebar.tsx` line 184: change label from `"Inbox"` to `"Leads"`, icon from `MessageSquare` to `Users`
- In `AppLayout.tsx` line 84: same change for the mobile nav

### 2. Default tab switches to "leads"
- In `UnifiedInboxPage.tsx` line 81: change default from `"calls"` to `"leads"`
- Update page title (line 238-239): "Inbox" becomes "Leads", description becomes "Every customer interaction, organized"
- Swap tab order so Leads tab appears first (left), Calls tab second (right)

### 3. Update all dashboard links that say "Inbox"
Files with `/app/inbox` references to update labels (URLs stay the same since the route doesn't change):
- `MetricsGrid.tsx` -- link labels stay, URLs unchanged
- `LiveActivityFeed.tsx` -- "View All" link unchanged
- `DashboardHeroCard.tsx` -- unchanged (links to calls tab)
- `TodaySnapshot.tsx` -- unchanged
- `ActivityFeed.tsx` -- unchanged
- `HelpGuideDashboard.tsx` line 195: change label from "Inbox" to "Leads"

### 4. Lead Detail Slide-over Panel
Create `src/components/leads/LeadDetailPanel.tsx`:
- Triggered when clicking a LeadCard on the Leads tab
- Shows customer name, phone, status badge, source
- Lists the customer's call history (queried from `ai_call_sessions` by phone match)
- Shows extracted payload details using the existing `ExtractedPayloadDisplay` component
- Action buttons: Call Back, Book Appointment, Send Message
- Closes with X button or clicking outside

### 5. Wire up LeadCard click to open the detail panel
- In `UnifiedInboxPage.tsx`, add state for `selectedLead`
- Pass `onClick` to each `LeadCard` to set the selected lead
- Render `LeadDetailPanel` at the bottom of the page (same pattern as `CallDetailPanel`)

## Technical Details

### LeadDetailPanel component structure
- Uses `Sheet` (from shadcn/vaul) for slide-over behavior, matching `CallDetailPanel` pattern
- Fetches related calls via: `supabase.from('ai_call_sessions').select(...).eq('tenant_id', tenantId).eq('caller_phone', lead.phone)`
- Displays call history as a timeline list with timestamps, outcomes, and summaries
- Uses existing `ExtractedPayloadDisplay` for structured data from the most recent call

### Files to create
1. `src/components/leads/LeadDetailPanel.tsx`

### Files to modify
1. `src/components/layouts/AppSidebar.tsx` -- rename nav item + icon
2. `src/components/layouts/AppLayout.tsx` -- rename mobile nav item
3. `src/pages/app/UnifiedInboxPage.tsx` -- default tab, title, tab order, lead detail wiring
4. `src/components/help/HelpGuideDashboard.tsx` -- rename label


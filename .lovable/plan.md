

# Agency Lead Finder: Save, Track, and Rate-Limit

## Overview
Three enhancements to the Lead Finder on the agency dashboard:
1. **3-search daily limit** to conserve API credits
2. **Save leads** to a persistent database with all detail fields
3. **Track lead status** (called, interested, not interested, etc.) and prevent duplicates

---

## New Database Tables

### `agency_lead_searches` -- Rate Limiting
Tracks each search an agency performs. The app checks this table before allowing a search.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| agency_id | uuid (FK) | References agency_accounts |
| industry | text | What they searched |
| location | text | Where they searched |
| result_count | int | How many leads returned |
| searched_at | timestamptz | Defaults to now() |

### `agency_saved_leads` -- Persistent Lead Storage
Stores every field from the lead detail panel plus a tracking status.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| agency_id | uuid (FK) | References agency_accounts |
| name | text | Business name |
| phone | text | Nullable |
| website | text | Nullable |
| address | text | Nullable |
| industry | text | Nullable |
| rating | numeric | Nullable |
| review_count | int | Nullable |
| employee_estimate | text | Nullable |
| hours | text | Nullable |
| reason | text | Why they need CloseLoop |
| friction_signals | text[] | Array of signal keys |
| confidence | text | high/medium/low |
| score | int | Computed score (0-100) |
| temperature | text | hot/warm/cold |
| score_reasons | text[] | Array of scoring explanations |
| status | text | Default 'new' -- new, contacted, interested, not_interested, converted, skipped |
| notes | text | Free-text notes from the agency user |
| created_at | timestamptz | When saved |
| updated_at | timestamptz | Auto-updated via trigger |

Unique constraint on `(agency_id, name, address)` to prevent saving the same business twice.

RLS policies: agency users can only see/edit their own leads (where agency_id matches their agency_accounts.id).

---

## How It Works

### Rate Limiting (3 searches/day)
- Before each search, query `agency_lead_searches` for today's count
- Show remaining searches in the UI (e.g., "2 of 3 searches remaining today")
- Disable the search button and show a message when limit is reached
- Each successful search inserts a row into `agency_lead_searches`
- The edge function `agency-lead-search` will also enforce the limit server-side

### Saving Leads
- After a search returns results, a "Save All Leads" button appears to batch-save the entire result set
- Individual leads can also be saved from the detail panel via a "Save Lead" button
- Saved leads are checked against existing records by `(agency_id, name, address)` -- duplicates are skipped with a toast notification
- Search results that are already saved will show a "Saved" badge on their card

### Saved Leads View
- A new "Saved Leads" tab alongside the search interface
- Displays all saved leads in a table/list with:
  - Business name, industry, temperature badge, phone, status
  - Filterable by status (All, New, Contacted, Interested, Converted)
- Clicking a saved lead opens the same detail panel with all stored information
- Status can be changed via a dropdown on each row or in the detail panel
- A notes field in the detail panel allows free-text tracking (what they said, follow-up date, etc.)

### Deduplication
- When search results come back, cross-reference against `agency_saved_leads` by business name
- Already-saved leads show a "Saved" indicator and are not re-saveable
- This prevents wasting time on businesses you've already prospected

---

## UI Changes

### AgencyLeadFinder.tsx
- Add tabs: "Search" | "Saved Leads"
- Add search counter badge: "X/3 searches used today"
- Add "Save All" button on search results
- Add "Save" button per lead card
- Show "Saved" badge on already-saved leads in search results

### LeadDetailPanel.tsx
- Add "Save Lead" button (if not already saved)
- Add status dropdown (New, Contacted, Interested, Not Interested, Converted, Skipped)
- Add notes text area with save button
- Show "Saved" state with timestamp

### New: SavedLeadsTab.tsx
- Table view of all saved leads for the agency
- Status filter tabs
- Inline status change dropdown
- Click-to-open detail panel
- Bulk actions (mark as contacted, delete)

---

## Technical Steps

1. Create database migration with both new tables, RLS policies, and updated_at trigger
2. Update `agency-lead-search` edge function to check and log searches server-side
3. Create a new hook `useAgencySavedLeads` for CRUD operations on saved leads
4. Create a new hook `useAgencySearchLimit` to check daily search count
5. Update `AgencyLeadFinder.tsx` with tabs, rate limit display, and save buttons
6. Update `LeadDetailPanel.tsx` with save/status/notes controls
7. Create `SavedLeadsTab.tsx` component for the saved leads view

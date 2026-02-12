

# Dispatch-Friendly Navigation Overhaul

## The Problem

For a dispatch company (like a towing business), the sidebar shows **"Leads"** and **"Customers"** as separate tabs. This doesn't match how they think:

- A tow truck company doesn't think in "leads" -- they get **calls** and either dispatch a truck or don't.
- "Customers" as a standalone section feels disconnected from the job flow -- they track people through the jobs themselves, not a separate CRM page.

The existing `UnifiedInboxPage` already contains both a **Calls** tab and a **Leads** tab, but it's labeled "Leads" in the sidebar, which buries the most important thing (the call log).

---

## The Solution

Make the sidebar navigation **mode-aware** so dispatch businesses see terminology and structure that matches their workflow.

### Changes

#### 1. Sidebar Labels Become Mode-Aware

In `AppSidebar.tsx`, change the hardcoded "Leads" label to use industry terms:

| Business Mode | Current Label | New Label | Icon |
|---------------|--------------|-----------|------|
| dispatch | Leads | Call Log | Phone |
| food | Leads | Leads | Users |
| medical | Leads | Leads | Users |
| service | Leads | Leads | Users |
| sales | Leads | Leads | Users |

Similarly for "Customers":

| Business Mode | Current Label | New Label |
|---------------|--------------|-----------|
| dispatch | Customers | Customers (keep, but lower in nav) |
| food | Customers | Guests |
| medical | Customers | Patients |
| sales | Customers | Prospects |
| service/general | Customers | Customers |

The Customers label already partially works via `terms.customers` -- it just needs consistent capitalization.

#### 2. Default Tab Flips for Dispatch

In `UnifiedInboxPage.tsx`, the default tab is currently `"leads"`. For dispatch-mode tenants, flip the default to `"calls"` so they land on the call log first.

#### 3. Page Title Adapts

In `UnifiedInboxPage.tsx`, change the page header from a hardcoded "Leads" to a mode-aware title:

- Dispatch: **"Call Log"** with description "Every call, organized by priority."
- Others: Keep **"Leads"** with "Every customer interaction, organized."

#### 4. Mobile Nav Follows Suit

In `AppLayout.tsx`, the mobile bottom nav also hardcodes "Leads". Update it to use the same mode-aware label and icon.

---

## Technical Details

### Files Modified

1. **`src/components/layouts/AppSidebar.tsx`** (lines 189-190)
   - Replace hardcoded "Leads" with mode-aware label and icon
   - The `caps` prop already includes `isDispatchBusiness`; use it to select the label
   - Pass `terms` through for customer label (already partially done)

2. **`src/pages/app/UnifiedInboxPage.tsx`** (lines 85-87, 262-266)
   - Add `useCapabilities()` hook
   - Default tab: `caps.isDispatchBusiness ? "calls" : "leads"`
   - Page title: conditional on `caps.isDispatchBusiness`

3. **`src/components/layouts/AppLayout.tsx`** (line 84)
   - Mobile nav: change "Leads" to mode-aware label using `caps.isDispatchBusiness`

4. **`src/lib/terminology.ts`**
   - Add two new fields to `IndustryTerms`: `inboxPageTitle` and `inboxPageIcon`
   - Dispatch: `"Call Log"`, all others: `"Leads"`

### No New Files

This is purely label/default changes in existing files. No new components, no database changes, no edge functions.

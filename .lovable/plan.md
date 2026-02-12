

# Callback-Only Tenant Experience Overhaul

Smiles Auto Works operates in "Capture & Callback" mode -- the AI never books appointments, it only qualifies leads and collects information. The current UI has several gaps that make this workflow frustrating. This plan addresses all of them.

---

## Problem 1: Leads page has no way to convert a lead into a customer

When AI only captures info, there's no booking event to automatically confirm someone became a customer. The owner needs a manual "Mark as Won" / "Convert to Customer" action.

**Fix:**
- Add a "Convert to Customer" action in the `LeadCard` dropdown menu and `LeadDetailPanel`
- When clicked: update the lead status to `won`, then upsert a record in the `customers` table using the lead's name, phone, and email
- Add a "Mark as Lost" quick action too
- This creates the bridge between Leads and Customers that callback-only tenants need

---

## Problem 2: Leads page shows all leads in one flat list with no prioritization

Spam calls, hang-ups, and junk sit alongside hot leads. There's no separation.

**Fix:**
- Add sub-tabs within the Leads tab: **Hot** (new + has phone), **Follow-up** (contacted/qualified), **Closed** (won/lost/booked)
- Default view shows Hot leads only
- Each sub-tab shows a count badge
- Unimportant calls (lost with no info, very short duration) go to Closed automatically

---

## Problem 3: Customers page has no concept of "confirmed customer" vs "just a contact"

For callback-only tenants, the Customers table is just a flat list with no lifecycle stage.

**Fix:**
- Add a `lifecycle_stage` concept using the existing `tags` column (tag with "prospect" or "active_customer")
- Show filter tabs on Customers page: **Active Customers** | **Prospects** | **All**
- When a lead is converted, the customer gets tagged as "active_customer"
- Customers created from AI calls default to "prospect"

---

## Problem 4: Dashboard shows booking-centric widgets that don't apply

The `ServiceDashboardLayout` shows `TodayCalendarStrip` and "Quick Book" -- irrelevant for callback-only tenants.

**Fix:**
- In `ModeContentArea`, detect callback-only mode (`ai_behavior_mode === 'callback_only'`)
- When active, render a new `CallbackDashboardLayout` instead of `ServiceDashboardLayout`
- New layout shows: Lead funnel summary, recent hot leads list, and a "View Leads" quick action (no calendar strip, no booking button)

---

## Problem 5: MetricsGrid shows "Bookings This Week" for callback-only -- always zero

**Fix:**
- Already partially handled (there's an `isCallbackOnly` branch in MetricsGrid)
- Update it to show: **Calls Today** | **New Leads** | **Customers** instead of bookings
- Add a "New Leads" metric that counts leads with status `new`

---

## Summary of Changes

### New Files
1. `src/components/dashboard/layouts/CallbackDashboardLayout.tsx` -- Dashboard layout for capture-and-callback tenants (lead funnel + hot leads list)

### Modified Files
1. `src/components/dashboard/ModeContentArea.tsx` -- Add callback-only detection, render `CallbackDashboardLayout`
2. `src/components/dashboard/MetricsGrid.tsx` -- Add "New Leads" metric for callback-only, replace bookings metric
3. `src/pages/app/UnifiedInboxPage.tsx` -- Add sub-filtering (Hot / Follow-up / Closed) within the Leads tab
4. `src/components/leads/LeadCard.tsx` -- Add "Convert to Customer" and "Mark Lost" actions
5. `src/components/leads/LeadDetailPanel.tsx` -- Add convert/status-change buttons, show lifecycle actions
6. `src/hooks/useLeads.ts` -- Add `convertToCustomer` mutation (updates lead to `won` + upserts customer)
7. `src/pages/app/CustomersPage.tsx` -- Add lifecycle filter tabs (Active / Prospects / All)

### Technical Details

**Convert-to-Customer flow (in `useLeads.ts`):**
```
1. Update lead status to "won"
2. Upsert customer: supabase.from("customers").upsert({
     tenant_id, full_name, phone_e164: lead.phone,
     email: lead.email, source: "ai_call",
     tags: ["active_customer"]
   }, { onConflict: "tenant_id,phone_e164" })
3. Invalidate both "leads" and "customers" queries
```

**Callback-only detection (reusable pattern):**
```
const isCallbackOnly =
  (assistantSettings as any)?.ai_behavior_mode === "callback_only";
```

**Lead sub-filters in UnifiedInboxPage:**
- Hot: `status === "new" && phone !== null`
- Follow-up: `status === "contacted" || status === "qualified"`
- Closed: `status === "won" || status === "lost" || status === "booked"`


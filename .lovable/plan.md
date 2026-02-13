
# Professional CRM Redesign: Leads + Customers Pages

## Overview

Redesign both the Leads and Customers pages into a polished, professional CRM experience with intelligent lead scoring, mode-aware terminology, and rich customer profiles.

---

## Part 1: Database Migration

Add two columns to the `customers` table that are currently missing:

| Column | Type | Purpose |
|--------|------|---------|
| `service_address` | `text` | Customer's primary service/delivery address |
| `lead_status` | `text` (default `'new'`) | Lead temperature tracking on the customer record |

No changes needed to the `leads` table -- it already has `vehicle_or_context`, `status`, and the linked `customer_id`.

---

## Part 2: Leads Page Redesign

### Smart Lead Intelligence

The leads table already has linked `ai_call_sessions` with `lead_score` (hot/warm) and `outcome`. The redesigned page will:

1. **Compute lead temperature** from the most recent call session's `lead_score` + recency + status:
   - **Hot**: `lead_score = 'hot'` OR status = `booked` OR called within last 24h
   - **Warm**: `lead_score = 'warm'` OR status = `contacted`/`qualified` OR called within 3 days
   - **Cold**: Everything else (no recent activity, older than 7 days, no score)

2. **New stat cards**: Total | Hot | Warm | Cold (replacing the current generic stats)

3. **Visual temperature indicators**: Color-coded flame/thermometer badges on each row

4. **Segmented view with tabs**: "All", "Hot", "Warm", "Cold" tabs for quick filtering

5. **Enhanced table columns**:
   - Name + phone (existing)
   - Temperature badge (new -- hot/warm/cold with color)
   - Status badge (existing)
   - Source (existing)
   - Context/request (from `vehicle_or_context` -- mode-aware label)
   - Last activity (computed from `last_message_at` or linked call session)
   - Actions dropdown (existing)

6. **Mode-aware labels**: Use `useIndustryContext()` terms throughout -- "Prospects" for sales, "Patients" for medical, "Leads" for service/general, "Callers" for dispatch.

### Lead Detail Panel Enhancement

- Show linked customer info if `customer_id` exists
- Display temperature badge prominently
- Show all call sessions with extracted payload data
- Mode-aware action buttons

---

## Part 3: Customers Page Redesign

### Professional CRM Table

Redesign the table to show all critical fields at a glance:

| Column | Source | Notes |
|--------|--------|-------|
| Name | `full_name` | With avatar initials circle |
| Phone | `phone_e164` | Formatted display |
| Email | `email` | With dash fallback |
| Service Address | `service_address` (new column) | Mode-aware label ("Delivery Address" for food, "Patient Address" for medical) |
| Last Service | Computed from most recent completed booking | Shows date or "Never" |
| Source | `source` | Badge |
| Added | `created_at` | Relative time |

### Call History Integration

Add a **"Recent Calls"** column or indicator showing the count of calls in the last 30 days, making it easy to see engagement at a glance.

### Customer Detail Sheet Enhancement

- Add `service_address` field (editable)
- Show "Last Service Date" computed from bookings
- Mode-aware tab labels (e.g., "Orders" instead of "Bookings" for food, "Appointments" for medical)

### Mode-Aware Adaptations

| Mode | Address Label | Service Label | Customer Label |
|------|--------------|---------------|----------------|
| service | Service Address | Last Service | Customer |
| dispatch | Pickup Location | Last Job | Customer |
| food | Delivery Address | Last Order | Guest |
| medical | Patient Address | Last Visit | Patient |
| sales | Address | Last Appointment | Prospect |
| general | Address | Last Interaction | Customer |

---

## Part 4: Build Error Fix

The `npm:openai` error is a Supabase runtime/types issue from `@supabase/functions-js` -- not caused by our code (no openai imports exist in the codebase). This is an environment-level issue that resolves on redeployment and does not affect the frontend build.

---

## Technical Implementation

### Files to Create
- `src/hooks/useLeadIntelligence.ts` -- Hook that joins leads with their latest `ai_call_sessions` to compute temperature scores
- `src/hooks/useCustomerLastService.ts` -- Hook that fetches most recent completed booking per customer

### Files to Modify
- `src/pages/app/LeadsPage.tsx` -- Full redesign with temperature tabs, smart stats, enhanced table
- `src/pages/app/CustomersPage.tsx` -- Enhanced table with address, last service, call count columns
- `src/hooks/useCustomers.ts` -- Update `Customer` interface to include `service_address` and `lead_status`
- `src/components/customers/CustomerDetailSheet.tsx` -- Add address field, mode-aware tab labels, last service date
- `src/components/customers/CreateCustomerDialog.tsx` -- Add service address field
- `src/components/leads/LeadCard.tsx` -- Add temperature badge (if still used elsewhere)

### Database Migration
```sql
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS service_address text,
  ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'new';
```

### Query Strategy for Lead Intelligence

Instead of N+1 queries, the `useLeadIntelligence` hook will fetch all leads with a single joined query to get the most recent call session's `lead_score` per lead, then compute temperature client-side. This keeps the implementation simple and performant.

### Query Strategy for Last Service Date

The customers page will batch-fetch the most recent `completed` booking for all displayed customers using an RPC or a separate query grouped by `lead_id` joined through leads by phone number. This avoids per-customer queries.

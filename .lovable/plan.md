

# Demo Accounts System for Admin & Agencies

## Overview

A new "Demo Accounts" feature that lets both the admin and agencies create temporary, lightweight business profiles from a website URL. These demo profiles attach to a shared demo phone number (one per user: the admin's existing test line, and a new per-agency demo number). When someone calls the demo number, it routes to whichever demo profile is currently "active" -- just like the admin test line already works.

Demo accounts are NOT real tenant accounts. They live in a dedicated `demo_profiles` table, are ephemeral, and can be swapped instantly.

## How It Works

1. Admin or agency clicks "Create Demo" from their dashboard
2. They paste a business website URL
3. The existing `import-business-website` edge function scrapes and extracts business data
4. A new `create-demo-profile` edge function saves this as a lightweight demo profile (not a real tenant)
5. The demo profile becomes the "active" demo, routing the shared demo number to it
6. When done demoing, they can switch to a different demo profile or deactivate it

## Database Changes

### New table: `demo_profiles`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| owner_id | uuid (FK users) | The admin or agency user who created it |
| owner_type | text | "admin" or "agency" |
| agency_id | uuid (nullable) | Links to agency_accounts if owner is agency |
| business_name | text | From website import |
| industry | text | Suggested industry slug |
| business_mode | text | service/dispatch/food/medical/general |
| website_url | text | Source URL |
| address | text (nullable) | |
| phone_extracted | text (nullable) | The business's actual phone (for display) |
| hours_json | jsonb | Operating hours |
| services_json | jsonb | Array of services |
| faqs_json | jsonb | Array of FAQs |
| description | text | Business summary |
| is_active | boolean | Currently routed to demo number |
| created_at | timestamptz | |

### New table: `demo_phone_numbers`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| owner_id | uuid | Admin user or agency user |
| owner_type | text | "admin" or "agency" |
| phone_e164 | text | The shared demo number |
| twilio_sid | text | |
| active_demo_profile_id | uuid (nullable, FK demo_profiles) | Currently active demo |
| created_at | timestamptz | |

RLS: Both tables filtered by `owner_id = auth.uid()`.

## Edge Function Changes

### New: `create-demo-profile`
- Accepts website extraction result + owner context
- Creates row in `demo_profiles`
- Sets it as active on the owner's demo number
- Deactivates any previously active demo profile

### New: `activate-demo-profile`
- Switches which demo profile is active on the demo number

### New: `delete-demo-profile`
- Soft or hard deletes a demo profile

### Modified: `twilio-inbound`
- Add a new routing check: after admin test line routing, also check `demo_phone_numbers` table
- If the called number matches a `demo_phone_numbers` entry with an active profile, build the business context from `demo_profiles` data instead of the `tenants` table

### Modified: `register-call` / `build-business-brain`
- Add a `demo_profile_id` path: when present, load business context from `demo_profiles` instead of tenant tables
- Dynamic variables populated from demo profile data (business_name, hours, services, etc.)

## Frontend Changes

### Admin Side
- New "Demo Accounts" page at `/admin/demos`
- Admin sidebar gets a "Demos" link
- Page shows: list of demo profiles, "Create Demo" button, ability to activate/deactivate
- "Create Demo" opens a dialog with the website import flow (reuses `WebsiteQuickStart` component logic)
- Active demo shows a green badge and the demo phone number to call

### Agency Side
- New "Demos" tab in agency sidebar at `/app/agency/demos`
- Same UI pattern: list of demos, create new, activate/switch
- Agency demo number provisioned on first demo creation (or admin assigns one)

### Shared Components
- `DemoProfileCard` -- shows business name, industry, website, active status, "Activate" / "Delete" buttons
- `CreateDemoDialog` -- website URL input, scan, preview extracted data, confirm creation
- `DemoNumberBanner` -- shows the demo phone number and which profile is active

## Call Flow for Demo Calls

```text
Caller dials demo number
  --> twilio-inbound
    --> Lookup phone_numbers table (no match)
    --> Lookup demo_phone_numbers table (match found)
    --> Load active_demo_profile_id
    --> Load demo_profiles row
    --> Build business context from demo profile JSON fields
    --> Register call with ElevenLabs using demo profile data
    --> AI answers as that business
```

## Technical Notes

- Demo profiles are completely separate from tenants -- no tenant_users, no subscriptions, no real data
- The website import edge function already exists and works well; we reuse it as-is
- The admin's existing shared test line (+1-855-329-7357) can double as their demo number initially
- For agencies, we can either provision a dedicated Twilio number per agency or use a pool approach
- Demo calls do NOT create real sessions, customers, or bookings -- they are fire-and-forget demonstrations
- Demo profiles can be created and deleted freely with no billing impact

## File Summary

**New files (~10):**
- `supabase/functions/create-demo-profile/index.ts`
- `supabase/functions/activate-demo-profile/index.ts`
- `supabase/functions/delete-demo-profile/index.ts`
- `src/pages/admin/AdminDemosPage.tsx`
- `src/pages/app/agency/AgencyDemosPage.tsx`
- `src/components/demos/DemoProfileCard.tsx`
- `src/components/demos/CreateDemoDialog.tsx`
- `src/components/demos/DemoNumberBanner.tsx`
- `src/hooks/useDemoProfiles.ts`

**Modified files (~5):**
- `supabase/functions/twilio-inbound/index.ts` -- add demo number routing
- `supabase/functions/elevenlabs-init/index.ts` -- support demo profile context
- `src/components/layouts/AppSidebar.tsx` -- add Demos link for agency
- `src/App.tsx` -- add new routes
- Admin sidebar config -- add Demos link

**Database:**
- 1 migration creating `demo_profiles` and `demo_phone_numbers` tables with RLS

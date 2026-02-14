

# Mode-Aware Customer Detail Sheet

## The Problem

When you click on a customer, the detail sheet always shows **Vehicles, Jobs, Calls, Bookings, Notes** tabs -- even for a plumbing company where "Vehicles" makes no sense. The entire panel needs to adapt based on the business type.

## The Fix

Make the Customer Detail Sheet industry-aware by using the existing `useIndustryContext()` hook to control which tabs appear and what they're called.

### Tab Visibility Rules

| Business Category | Tab 1 | Tab 2 | Tab 3 | Tab 4 | Tab 5 |
|-------------------|-------|-------|-------|-------|-------|
| Auto Services (detailing, repair) | Vehicles | Jobs | Calls | Bookings | Notes |
| Dispatch (towing) | Vehicles | Jobs | Calls | Dispatches | Notes |
| Home Services (plumbing, HVAC) | Service History | Calls | Appointments | Notes | -- |
| Beauty/Wellness (salon, spa) | Visit History | Calls | Appointments | Notes | -- |
| Food (restaurant) | Order History | Calls | Reservations | Notes | -- |
| Medical (dental, medspa) | Visit History | Calls | Appointments | Notes | -- |
| Sales (dealership) | Vehicles | Calls | Appointments | Notes | -- |
| General/Professional | Service History | Calls | Bookings | Notes | -- |

**Key rules:**
- "Vehicles" tab only appears for `auto_services` category, `dispatch` mode, or `sales` mode (dealerships)
- "Jobs" tab only appears when the tenant has `hasJobTracking` capability (dispatch, auto shops)
- Bookings tab is renamed per mode: "Appointments" (service/medical/sales), "Reservations" (food), "Dispatches" (dispatch), "Bookings" (general)
- The "Book" action button adapts its label too: "Book Appointment", "Schedule Visit", "Place Order", etc.

### Contact Info Adaptations
- Address label changes: "Service Address" (plumbing), "Delivery Address" (food), "Patient Address" (medical), "Pickup Location" (dispatch)
- "Customer since" label adapts: "Patient since", "Guest since", "Prospect since"

## Build Error Fixes

Three existing build errors will also be fixed in this pass:
1. `ServiceCatalogEditor.tsx` -- `required_intake_fields` property doesn't exist on the type (remove or cast)
2. `SendSmsDialog.tsx` -- `currentTenantId` doesn't exist on AuthContext (use `tenant?.id` instead)
3. The `npm:openai` error is a Supabase environment issue, not in our code

## Technical Details

### File: `src/components/customers/CustomerDetailSheet.tsx`
- Import `useIndustryContext` and `useCapabilities`
- Add a helper function that returns which tabs to show and their labels based on `mode`, `category`, and capabilities
- Conditionally render the Vehicles tab only for auto/dispatch/sales
- Conditionally render the Jobs tab only when `hasJobTracking` is true
- Rename Bookings tab using `terms.bookings` (already available from terminology)
- Update action button labels using `terms`
- Update "Customer since" to use `terminology.customerLabel`

### File: `src/components/brain/ServiceCatalogEditor.tsx`
- Fix lines 477 and 509 by removing or properly typing `required_intake_fields`

### File: `src/components/messaging/SendSmsDialog.tsx`
- Replace `currentTenantId` with `tenant?.id` from `useAuth()`


Phase 4: Fix Operational Gaps — CRM, Broken Actions, Notifications, Portal Security

You are working on CloseLoop, a multi-tenant AI receptionist platform. Phases 1-3 (Brain redesign, Onboarding redesign, Business-Aware Everything) are complete. This phase fixes the critical operational gaps that businesses hit on Day 1 of actual usage.

Read these files FIRST to understand existing patterns before making any changes:

src/hooks/useCustomers.ts
src/hooks/useKnowledgeGaps.ts
src/pages/app/BookingsPage.tsx
src/pages/app/LeadsPage.tsx
src/pages/app/CustomerPortalPage.tsx
src/components/settings/SettingsPage.tsx (lines 130-151 specifically)
src/components/layouts/AppSidebar.tsx
src/pages/app/ReportsROIPage.tsx
supabase/functions/universal-delivery/index.ts
src/hooks/useIndustryContext.ts
src/hooks/useCapabilities.ts
src/hooks/useBusinessContext.ts (if it exists from Phase 3)
src/integrations/supabase/types.ts



Task 1: Build the Customer/CRM Page (P0 — HIGH IMPACT)

There is currently NO customer management page. The customers table exists and is the single source of truth for identity (unique constraint: tenant_id, phone_e164). The useCustomers hook already exists. Build the full CRM experience.

1a. Create the Customers Page

New file: src/pages/app/CustomersPage.tsx

Build a full customer management page with:





Search bar (searches by name, phone, email)



Filter by: date range, source (AI call, manual, import), has bookings, has estimates



Sort by: most recent interaction, name, total bookings, created date



Customer list with columns: Name, Phone, Email, Last Contact, Total Calls, Total Bookings, Status



Click a customer row to open a detail sheet/panel

Customer Detail Sheet (slide-over or dialog):





Header: Customer name, phone (E.164 formatted for display), email, created date



Tabs:





History: All interactions chronologically — calls (ai_call_sessions), bookings, estimates, agreements, dispatch jobs. Each entry shows date, type, summary, outcome.



Bookings: All bookings for this customer with status, service, date, price



Notes: Free-text notes field (add notes column to customers table if it doesn't exist, or use a separate customer_notes table)



Details: Editable customer info — name, email, phone, address, vehicle info (for auto), any custom fields



Action buttons at top: "Call" (tel: link), "Book Appointment" (opens CreateBookingDialog pre-filled with customer), "Send Quote" (opens estimate builder pre-filled)

Industry awareness:





Use useIndustryContext() or useBusinessContext() for terminology



Auto repair: show "Vehicles" tab with vehicle history if vehicle data exists



Medical: show "Patient Info" instead of "Customer Info"



Food: show "Order History" instead of generic "History"



Column labels adapt: "Clients" for salons, "Patients" for medical, "Customers" for everything else

1b. Customer Merge Queue UI

The customer_merge_queue table exists but has no frontend. Add a section or sub-tab on the Customers page:





Show pending merge candidates (duplicate phone numbers, similar names)



For each merge candidate: show both records side by side



Actions: "Merge" (keeps primary, moves history from secondary), "Not Duplicates" (dismisses)



Per project knowledge: "Structured data always wins over AI-extracted"

1c. Add Route and Navigation





Add route /app/customers to src/App.tsx under the app layout



Add "Customers" nav item to src/components/layouts/AppSidebar.tsx in the workspace section



Use the Users icon from lucide-react



Position it after "Inbox" and before "Schedule"



Label adapts by industry: "Customers" (default), "Clients" (salon), "Patients" (medical)

1d. Manual Customer Creation





"Add Customer" button on the Customers page



Dialog with: Name, Phone (with E.164 normalization), Email (optional), Notes (optional)



On save: check for existing customer by (tenant_id, phone_e164) before creating (never create duplicates per project rules)



Task 2: Fix Broken Booking Actions (P0 — BROKEN FUNCTIONALITY)

BookingsPage.tsx has empty stub functions that do nothing when clicked.

2a. Fix handleEditBooking (currently empty)

Find the empty handleEditBooking function. Implement it:





Opens a dialog/sheet pre-filled with the booking's current data (service, date, time, customer, notes)



Allow editing: date/time (must check availability via fn_compute_available_slots), service, notes



On save: update the bookings table record



Show toast on success/failure

2b. Fix handleCancelBooking (currently empty)

Find the empty handleCancelBooking function. Implement it:





Show confirmation dialog: "Cancel this booking? [Customer Name] — [Service] on [Date]"



On confirm: update booking status to 'cancelled' in bookings table



Optionally release the calendar hold if one exists



Show toast on success

2c. Add Industry-Aware Labels





Title: "Schedule" becomes "Shop Schedule" (auto repair), "Client Schedule" (salon), "Patient Schedule" (medical), "Dispatch Schedule" (towing), "Orders" (food)



"New Booking" button: "Book Vehicle" (auto), "Book Client" (salon), "Book Patient" (medical), "New Order" (food)



Empty state message adapts per industry



Task 3: Fix Broken Lead Actions (P0 — BROKEN FUNCTIONALITY)

LeadsPage.tsx dropdown actions (around lines 182-199) are all non-functional. Fix each one:

3a. "Call" Action





Trigger a window.open('tel:' + lead.phone_e164) to initiate a phone call



If no phone number, show toast: "No phone number for this lead"

3b. "Send Message" Action





For now, open a simple dialog with a textarea and "Send" button



On send, create a record in the appropriate table (check if there's a messages or notifications table, or use universal-delivery edge function)



If SMS is not yet available (hasSmsFeature() returns false), show toast: "SMS messaging coming soon. Use the call button to reach this lead."

3c. "Book Appointment" Action





Open CreateBookingDialog (or equivalent booking creation component) pre-filled with the lead's customer data



After booking is created, update the lead's status to "booked" or "converted"

3d. "Send Quote" Action





Navigate to the Estimates page with the lead's customer pre-selected, OR open the estimate builder dialog pre-filled



If the business doesn't have estimates capability, hide this action entirely

3e. Enable "Add Lead" Button





The button is currently disabled. Enable it.



On click, open a dialog: Name, Phone, Email, Source (walk-in, referral, website, other), Notes



Create customer record (with dedup check) and create opportunity/lead record linked to it



Task 4: Build Real Notification Settings (P1 — MEDIUM EFFORT)

The Settings > Alerts section currently has hardcoded Switch toggles that don't save anywhere.

4a. Database Migration

Create a new notification_preferences table:

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, event_type, channel)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

Event types to support:





new_booking — When a new booking is created



booking_cancelled — When a booking is cancelled



missed_call — When a call goes unanswered or the AI can't help



new_lead — When a new lead/opportunity is created



new_estimate_request — When a customer requests an estimate



daily_summary — Daily recap of activity



knowledge_gap — When the AI encounters a question it can't answer



dispatch_urgent — Urgent dispatch request (dispatch mode only)



new_order — New order placed (food mode only)

Channels: email, sms, push (start with email only, sms and push marked as "coming soon")

4b. Update Settings Alerts UI

Replace the hardcoded switches in SettingsPage.tsx (lines 130-151) with:





Read from notification_preferences table for the current user



Each toggle saves/updates the preference in real-time (optimistic update with react-query mutation)



Group notifications by category:





Calls: Missed call alerts, knowledge gap alerts



Bookings: New booking, cancellation



Leads: New lead, estimate request



Summary: Daily summary



Mode-specific: Dispatch urgent (dispatch only), New order (food only)



Show "SMS" and "Push" toggles as disabled with "Coming soon" badge



Industry-aware labels: "New patient booking" for medical, "New client booking" for salon, etc.

4c. Create Hook

New file: src/hooks/useNotificationPreferences.ts





Fetches preferences for current user + tenant



Provides updatePreference(eventType, channel, enabled) mutation



Provides getPreference(eventType, channel) getter



Sets sensible defaults on first load (all email notifications ON by default)

4d. Wire to Universal Delivery (Future)

Do NOT modify the universal-delivery edge function in this phase. Just add a TODO comment in the notification preferences hook:

// TODO: Wire notification preferences into universal-delivery edge function
// When universal-delivery sends notifications, it should check preferences first



Task 5: Secure Customer Portal (P2)

CustomerPortalPage.tsx uses raw customer IDs as tokens. Fix the security issue.

5a. Create Portal Token Edge Function

New file: supabase/functions/generate-portal-token/index.ts





Takes a customer_id and tenant_id



Generates a signed JWT with:





sub: customer_id



tenant_id: tenant_id



exp: 24 hours from now



type: "customer_portal"



Signs with a secret (use PORTAL_TOKEN_SECRET from Supabase secrets, or generate from SUPABASE_SERVICE_ROLE_KEY)



Returns the token

5b. Create Portal Token Verification

New file: supabase/functions/verify-portal-token/index.ts





Takes a token string



Verifies the JWT signature and expiration



Returns the customer_id and tenant_id if valid



Returns 401 if invalid or expired

5c. Update CustomerPortalPage.tsx





Replace the raw ID token logic (line 140-141) with the signed JWT approach



On page load: call verify-portal-token with the URL token



If valid: load customer data using the returned customer_id



If invalid/expired: show "This link has expired. Please contact [business name] for a new link."



Add industry-aware branding: show business name and logo in portal header



Hide tabs that don't apply to the business (if no estimates capability, hide Estimates tab)



Task 6: Industry-Aware Reports Labels (P3 — POLISH)

In ReportsROIPage.tsx, the conversion funnel uses generic labels.

6a. Funnel Label Adaptation

Find the funnel stage labels and make them industry-aware:





Auto repair: Calls -> Quoted -> Booked -> Completed -> Paid



Salon: Calls -> Inquired -> Booked -> Attended -> Revenue



Towing: Calls -> Dispatched -> Completed -> Paid



Restaurant: Calls -> Ordered -> Fulfilled -> Revenue



Medical: Calls -> Inquired -> Scheduled -> Attended -> Billed



General: Calls -> Answered -> Created -> Completed (keep current)

Use useIndustryContext() to resolve the correct labels.



Critical Rules (from project knowledge — follow these exactly)





customers table is the single source of truth for identity. Unique constraint: (tenant_id, phone_e164).



Always normalize phone numbers to E.164 before any lookup or insert.



No hardcoded demo data in product paths.



All tables must have RLS enabled with tenant isolation.



Never reference auth.users directly in foreign keys from public schema.



Use validation triggers instead of CHECK constraints.



Standard error response pattern for edge functions (CORS headers, OPTIONS handler).



Industry context comes from useIndustryContext() hook (from Phase 1).



Business context comes from useBusinessContext() hook (from Phase 3) if available.



Soft deletes use is_active boolean, not hard deletes.

Implementation Order

Execute in this exact order:





Database migration for notification_preferences table



Create src/hooks/useNotificationPreferences.ts



Create src/pages/app/CustomersPage.tsx with full CRM



Add customer route to App.tsx and nav item to AppSidebar.tsx



Fix handleEditBooking in BookingsPage.tsx



Fix handleCancelBooking in BookingsPage.tsx



Add industry-aware labels to BookingsPage.tsx



Fix all lead actions in LeadsPage.tsx



Enable "Add Lead" button in LeadsPage.tsx



Replace fake notification toggles in SettingsPage.tsx with real ones



Create generate-portal-token and verify-portal-token edge functions



Update CustomerPortalPage.tsx with JWT security



Update report funnel labels in ReportsROIPage.tsx




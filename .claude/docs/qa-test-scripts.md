# QA Test Scripts — All Gates

Each gate has an exact test procedure. Follow the steps literally.
The standard is HIGH: "Would a real business owner pay $249/month for this?"

App URL: https://app.getfluxdata.com
Admin login: jackangelini@icloud.com / test1234 (fallback: Moochie1245!)

---

## FUNCTIONAL GATES (9 gates — automated AI conversation tests)

### GATE: functional/booking_creates_correctly
TYPE: AUTOMATED
RUN: npx tsx C:/Users/jacka/lenard/scripts/qa-tests/index.ts --mode [MODE] --scenario booking --verbose
WHAT IT TESTS: Real AI conversation requesting an appointment. AI should use the booking tool to create a real record in the database.
PASS IF: Script output shows pass=true AND booking record exists in database with correct customer name, service, date/time.
FAIL IF: AI says "someone will call you back" instead of booking, OR no database record created, OR script returns pass=false.
EVIDENCE: Copy the full script output including pass/fail status and database verification.
COST: ~$0.05 (authorized)

### GATE: functional/booking_sms_confirmation
TYPE: AUTOMATED
RUN: npx tsx C:/Users/jacka/lenard/scripts/qa-tests/index.ts --mode [MODE] --scenario booking-sms --verbose
WHAT IT TESTS: After a booking is created via AI conversation, an SMS confirmation should be dispatched.
PASS IF: Booking created AND SMS dispatch evidence found in notifications table or event logs.
FAIL IF: Booking created but no SMS evidence, OR booking not created at all.
EVIDENCE: Script output + SMS dispatch evidence from database.
COST: ~$0.05 + ~$0.01 SMS (authorized)

### GATE: functional/emergency_routing_works
TYPE: AUTOMATED
RUN: npx tsx C:/Users/jacka/lenard/scripts/qa-tests/index.ts --mode [MODE] --scenario emergency --verbose
WHAT IT TESTS: Customer reports an emergency (burst pipe, gas leak, etc.). AI should detect emergency keywords and route appropriately.
PASS IF: AI detects emergency, responds with urgency, triggers emergency routing (not a normal booking flow).
FAIL IF: AI treats emergency as a normal call.
EVIDENCE: Script output showing emergency detection.

### GATE: functional/callback_request_works
TYPE: AUTOMATED
RUN: npx tsx C:/Users/jacka/lenard/scripts/qa-tests/index.ts --mode [MODE] --scenario callback --verbose
WHAT IT TESTS: Customer requests a callback instead of booking now. AI should capture the request.
PASS IF: Callback request captured in database.
FAIL IF: No callback record created.

### GATE: functional/cancel_booking_works
TYPE: AUTOMATED
RUN: npx tsx C:/Users/jacka/lenard/scripts/qa-tests/index.ts --mode [MODE] --scenario cancel-booking --verbose
WHAT IT TESTS: Customer wants to cancel an existing booking. AI should handle the cancellation.
PASS IF: Booking status updated to cancelled in database.
FAIL IF: Cancellation not processed.

### GATE: functional/reschedule_booking_works
TYPE: AUTOMATED
RUN: npx tsx C:/Users/jacka/lenard/scripts/qa-tests/index.ts --mode [MODE] --scenario reschedule --verbose
WHAT IT TESTS: Customer wants to move their appointment to a different time.
PASS IF: Booking date/time updated in database.
FAIL IF: Reschedule not processed.

### GATE: functional/service_area_validation
TYPE: AUTOMATED
RUN: npx tsx C:/Users/jacka/lenard/scripts/qa-tests/index.ts --mode [MODE] --scenario service-area --verbose
WHAT IT TESTS: Customer inside service area should be accepted. Customer outside should be politely declined.
PASS IF: In-area request accepted, out-of-area request declined with explanation.
FAIL IF: No service area check performed, or wrong result.

### GATE: functional/transfer_to_human_works
TYPE: AUTOMATED
RUN: npx tsx C:/Users/jacka/lenard/scripts/qa-tests/index.ts --mode [MODE] --scenario transfer --verbose
WHAT IT TESTS: Customer requests to speak to a real person. AI should initiate transfer.
PASS IF: Transfer initiated or escalation recorded.
FAIL IF: AI ignores transfer request.

### GATE: functional/ai_handles_edge_cases
TYPE: AUTOMATED
RUN: npx tsx C:/Users/jacka/lenard/scripts/qa-tests/index.ts --tag edge-case --verbose
WHAT IT TESTS: Garbage input, very long messages, mid-conversation disconnect — AI should handle gracefully.
PASS IF: AI responds politely and doesn't crash for all edge case inputs. No data corruption from disconnects.
FAIL IF: AI crashes, hangs, gives nonsensical responses, or creates records from incomplete conversations.

---

## ONBOARDING GATES (7 gates — browser tests)

### GATE: onboarding/complete_flow_works
TIME: ~5 min
STEPS:
1. Navigate to /app/onboarding
2. Walk through ALL 5 phases:
   - Phase 1: Business identity (name, industry, mode)
   - Phase 2: Services (what you offer, pricing)
   - Phase 3: Hours & service area
   - Phase 4: AI personality (greeting, tone, behavior)
   - Phase 5: Review & activate
3. Verify each phase renders correctly with no errors
4. Verify progress bar advances properly
5. Verify "Back" button works on each phase (doesn't lose data)
6. DO NOT click final "Complete" button (triggers Twilio provisioning)
7. Check that the flow would PRODUCE a working tenant config if completed
PASS IF: All 5 phases render, flow is logical, data entered in Phase 1 appears in Phase 5 review.
FAIL IF: Any phase shows error, blank screen, data loss between phases, or broken navigation.
EVIDENCE: Screenshots of each phase + notes on any issues.

### GATE: onboarding/questions_relevant_to_mode
TIME: ~5 min
STEPS:
1. Start onboarding for the current target mode
2. For EACH question on EVERY phase, ask yourself:
   "Would a [business type] owner need to answer this?"
   "Is this question even relevant to how [business type] businesses operate?"
3. Check for mode-inappropriate questions:
   - SERVICE mode: should NOT ask about menu items, delivery radius, patient intake
   - DISPATCH mode: should NOT ask about appointment types, menu, patient forms
   - FOOD mode: should NOT ask about technician dispatch, service area radius (delivery radius is OK)
   - MEDICAL mode: should NOT ask about dispatch routes, menu items
   - SALES mode: should NOT ask about kitchen display, dispatch routes
4. Record EVERY question with your assessment of relevance
PASS IF: Every single question makes sense for this business type. Zero irrelevant questions.
FAIL IF: Any question is irrelevant, confusing, or belongs to a different mode.
EVIDENCE: Complete list of all questions with relevance assessment.

### GATE: onboarding/no_redundant_questions
TIME: ~4 min
STEPS:
1. Walk through all onboarding phases
2. For each question, check: "Is this exact information asked ANYWHERE else in the flow?"
3. Check for implicit duplicates: e.g., "business hours" in Phase 1 AND Phase 3
4. Check for duplicates with Business Brain (does onboarding ask something Brain will also ask?)
PASS IF: Each piece of information is asked exactly once.
FAIL IF: Same info requested in multiple places.
EVIDENCE: List of any duplicates found.

### GATE: onboarding/correct_terminology
TIME: ~4 min
STEPS:
1. Walk through all onboarding phases
2. Check EVERY label, heading, button, placeholder, and helper text
3. Verify mode-appropriate terminology:
   - SERVICE: "appointments", "services", "customers", "technicians"
   - DISPATCH: "jobs", "drivers", "dispatches", "routes"
   - FOOD: "orders", "menu items", "kitchen", "reservations"
   - MEDICAL: "patients", "appointments", "providers", "intake forms"
   - SALES: "leads", "prospects", "pipeline", "opportunities"
   - GENERAL: "calls", "messages", "callbacks"
4. Flag any generic terms that should be mode-specific
PASS IF: All text uses correct mode-specific terminology.
FAIL IF: Wrong mode terms or generic text where specific terms belong.
EVIDENCE: Screenshots of correct/incorrect terminology.

### GATE: onboarding/smart_defaults_prefilled
TIME: ~3 min
STEPS:
1. Start onboarding, select the target mode industry
2. On EACH phase, check: are obvious defaults pre-filled based on industry?
3. Examples of expected defaults:
   - Plumber: on-site service = yes, business hours 8-5 M-F, emergency service available
   - HVAC: seasonal services listed, service area radius ~50 miles
   - Restaurant: food ordering = yes, reservations = yes, kitchen display = yes
   - Dental: appointment types pre-populated, intake forms = yes
4. Check that pre-filled values are REASONABLE, not just empty or placeholder
PASS IF: Industry-appropriate defaults are pre-populated, saving the user time.
FAIL IF: Fields that obviously should have defaults are empty.
EVIDENCE: Screenshots showing pre-filled vs empty fields.

### GATE: onboarding/mobile_375px_usable
TIME: ~4 min
VIEWPORT: 375px width
STEPS:
1. Set browser viewport to 375px width
2. Navigate to /app/onboarding
3. Walk through each phase checking:
   - All buttons visible and tappable (not cut off)
   - Text readable, not truncated or overflowing
   - Form fields accessible, not overlapping
   - Progress bar visible
   - Next/Back buttons reachable without horizontal scrolling
4. Can the ENTIRE flow be completed at mobile width?
PASS IF: All phases usable at 375px, no horizontal scroll, all controls reachable.
FAIL IF: Any element cut off, unreachable, or requires horizontal scrolling.
EVIDENCE: Screenshots at 375px of each phase.

### GATE: onboarding/non_technical_usable
TIME: ~5 min
STEPS:
1. Walk through onboarding as a 55-year-old business owner who barely uses apps
2. For EACH screen: "Would this person understand what to do without calling for help?"
3. Check for:
   - Technical jargon (API, webhook, endpoint, integration, DNS, CNAME, etc.)
   - Unclear buttons (what does "Configure" mean?)
   - Missing instructions or help text
   - Assumed technical knowledge
   - Confusing navigation (where do I go next?)
4. The "business brain" concept itself — would a plumber understand what that means?
PASS IF: A non-technical business owner can complete onboarding unassisted.
FAIL IF: Any step requires technical knowledge or causes confusion.
EVIDENCE: Notes on every usability issue found.

---

## BUSINESS BRAIN GATES (6 gates — browser tests)

### GATE: brain/relevant_sections_only
TIME: ~4 min
STEPS:
1. Navigate to /app/business-brain
2. List EVERY visible section, tab, or category
3. For each, verify it's relevant to the current mode:
   - SERVICE: services catalog, pricing, business hours, service area, booking rules, emergency policies, FAQs, objection responses
   - DISPATCH: job types, coverage area, driver management, pricing (distance/flat rate), response times, fleet info
   - FOOD: menu management, hours, delivery settings, order policies, dietary restrictions, kitchen capacity
   - MEDICAL: appointment types, providers, intake form config, insurance info, HIPAA settings
   - SALES: lead qualification criteria, pipeline stages, follow-up rules, inventory/catalog
   - GENERAL: call handling rules, message templates, callback policies, routing rules
4. Flag ANY section that doesn't belong in this mode (e.g., "Menu Items" for a plumber)
PASS IF: Only mode-relevant sections visible. No cross-mode leakage.
FAIL IF: Sections from other modes are showing.
EVIDENCE: Screenshot of all visible sections with relevance notes.

### GATE: brain/settings_save_and_persist
TIME: ~5 min
STEPS:
1. Open Business Brain
2. Pick 3 different settings to change:
   a. Change a text field (business description or FAQ answer)
   b. Change a toggle/checkbox (if any exist)
   c. Change a list item (add or edit a service/FAQ)
3. Save each change
4. Verify save confirmation appears for each
5. Navigate AWAY from Business Brain (go to Dashboard)
6. Navigate BACK to Business Brain
7. Verify ALL 3 changes are still there
8. Press F5 (full page refresh)
9. Verify ALL 3 changes survived the refresh
10. Log out and log back in
11. Verify ALL 3 changes are still there
PASS IF: All changes save, survive navigation, survive refresh, survive re-login.
FAIL IF: Any change reverts at any point.
EVIDENCE: Screenshots showing values before save, after save, after navigation, and after refresh.

### GATE: brain/edits_reflect_in_ai_behavior
TIME: ~10 min
TYPE: CRITICAL — this is the most important brain gate
STEPS:
1. Open Business Brain and note the current greeting/intro message
2. Change the greeting to something distinctive (e.g., "Welcome to the best plumbing company in Jersey!")
3. Save the change and verify it persisted
4. Run a quick functional test to verify the AI uses the new greeting:
   npx tsx C:/Users/jacka/lenard/scripts/qa-tests/index.ts --mode [MODE] --scenario booking --verbose
5. Check the AI's response — does it use the new greeting or the old one?
6. If no automated test available: Check the build-business-brain edge function to verify it reads the saved data
7. Also check: If you add a new FAQ ("Do you offer weekend service?" → "Yes, Saturday 9-2"), does the AI know about it?
PASS IF: Brain edits are reflected in AI behavior. Changing the greeting changes what the AI says. Adding FAQs adds to the AI's knowledge.
FAIL IF: AI ignores brain edits and uses hardcoded/stale data.
EVIDENCE: Before/after brain edit screenshots + AI conversation showing the change reflected.

### GATE: brain/faq_management_works
TIME: ~5 min
STEPS:
1. Navigate to Business Brain, find the FAQ section
2. ADD a new FAQ: Question = "Do you offer financing?" Answer = "Yes, we offer 12-month zero-interest financing on all jobs over $500"
3. Save. Verify it appears in the FAQ list.
4. EDIT the FAQ: Change the answer to include "through GreenSky financing"
5. Save. Verify the edit persisted.
6. Navigate away and back. Verify it's still there.
7. DELETE the FAQ (if delete is available).
8. Verify it's removed.
9. Check: Can you add 10+ FAQs? Is there a reasonable limit displayed?
PASS IF: Full CRUD works — add, edit, delete FAQs, all changes persist.
FAIL IF: Can't add, edit fails to save, delete doesn't work, or data reverts.
EVIDENCE: Screenshots of add, edit, and delete operations.

### GATE: brain/service_pricing_management
TIME: ~5 min
STEPS:
1. Navigate to Business Brain, find the services/pricing section
2. For the current mode, check:
   - SERVICE: Can you see all services? Can you edit prices? Can you add a new service? Can you mark a service as unavailable?
   - DISPATCH: Can you set pricing rules (flat rate, per mile, per hour)? Can you add job types?
   - FOOD: Can you manage menu items? Add/edit prices? Set availability? Add modifiers?
   - MEDICAL: Can you manage appointment types and durations?
   - SALES: Can you manage product catalog/inventory?
3. Add a new service/item with a price
4. Save. Verify it appears. Navigate away and back. Verify it persists.
5. Edit the price. Save. Verify it updated.
6. Check: Does the pricing format make sense? (No "$0.00" for quote-only services, proper decimal formatting)
PASS IF: Can manage services/pricing for this mode. Add, edit, persist all work.
FAIL IF: Can't manage services, prices don't save, or formatting is wrong.
EVIDENCE: Screenshots of service management workflow.

### GATE: brain/customization_intuitive
TIME: ~5 min
STEPS:
1. Navigate to Business Brain
2. Walk through EVERY editable section as your persona (Mike the plumber, etc.)
3. For each section: "Would [persona] understand how to customize this?"
4. Check:
   - Are labels clear? (not "System Prompt" — should be "What your AI says")
   - Is the layout logical? (related settings grouped together)
   - Are there help tooltips on complex fields?
   - Is it clear what each setting DOES? (not just what it's called)
   - Can you find what you need quickly? (not buried 5 clicks deep)
5. Check for overwhelming sections: Is the first screen too dense?
6. Are advanced settings tucked away behind expandable sections?
PASS IF: A non-technical business owner can customize their Business Brain without confusion.
FAIL IF: Any section is confusing, poorly labeled, or requires technical knowledge.
EVIDENCE: Notes on every usability issue found.

---

## DASHBOARD GATES (8 gates — browser tests)

### GATE: dashboard/all_pages_load_no_errors
TIME: ~5 min
STEPS:
1. Open browser DevTools (Console tab)
2. Navigate to /app/dashboard
3. Click EVERY link in the navigation sidebar/header
4. For EACH page:
   a. Does it load? (no blank screen, no spinner forever)
   b. Any console errors? (red errors, not warnings)
   c. Any visual glitches? (overlapping elements, broken layout)
5. Check these specific pages:
   - Dashboard, Bookings/Jobs/Orders, Calls, Business Brain
   - Settings, Integrations, Usage, Reports
   - Mode-specific pages (Dispatch Map, Kitchen Display, Pipeline, etc.)
6. Count total console errors across all pages
PASS IF: Every nav link loads a real page with no console errors.
FAIL IF: Any page fails to load, shows blank screen, or has JS errors.
EVIDENCE: List of all pages tested with pass/fail + console error count.

### GATE: dashboard/correct_mode_terminology
TIME: ~4 min
STEPS:
1. Navigate through all dashboard pages
2. Check EVERY heading, label, button text, column header, and placeholder
3. Verify mode-appropriate terms:
   - SERVICE: "Appointments" (not "Jobs"), "Services" (not "Menu"), "Customers"
   - DISPATCH: "Jobs" (not "Appointments"), "Drivers", "Fleet", "Routes"
   - FOOD: "Orders" (not "Bookings"), "Menu", "Kitchen", "Reservations"
   - MEDICAL: "Appointments" or "Visits", "Patients" (not "Customers"), "Providers"
   - SALES: "Leads" (not "Customers"), "Pipeline", "Opportunities"
   - GENERAL: "Calls", "Messages", "Callbacks"
4. Check the sidebar navigation labels too
PASS IF: All text uses correct mode-specific terminology throughout the dashboard.
FAIL IF: Any text uses wrong-mode or generic terms.
EVIDENCE: Screenshots of any incorrect terminology found.

### GATE: dashboard/bookings_crud_works
TIME: ~6 min
STEPS:
1. Navigate to /app/bookings (or /app/jobs for dispatch, /app/orders for food)
2. CREATE: Can you create a new booking/job/order from the dashboard?
   - Click "New Appointment" or "Quick Book" or equivalent
   - Fill in customer name, service, date/time
   - Save. Does it appear in the list?
3. VIEW: Click on an existing booking. Does the detail view show correct info?
4. EDIT: Can you change the date/time or service? Save. Does it persist?
5. CANCEL: Can you cancel a booking? Does the status update?
6. FILTER: Can you filter by status (pending, confirmed, completed)?
7. Check calendar view (if exists): Do bookings appear on the correct dates?
PASS IF: Full CRUD works — create, view, edit, cancel bookings from the dashboard.
FAIL IF: Can't create, edit fails, cancel doesn't update status, or data doesn't persist.
EVIDENCE: Screenshots of each CRUD operation.

### GATE: dashboard/call_history_real_data
TIME: ~4 min
STEPS:
1. Navigate to /app/calls
2. Check: Does the call history show real data? (not empty, not placeholder)
3. For each call entry, verify it shows:
   - Caller name or phone number
   - Date/time of call
   - Duration
   - Outcome (booked, callback, missed, etc.)
   - Lead score or temperature (if applicable)
4. Click on a call entry — does it show the transcript?
5. If no calls exist: Does the empty state guide the user?
6. Check sort order: newest first?
PASS IF: Call history displays real data with all key fields, transcripts accessible.
FAIL IF: Data missing, malformed, no transcript access, or broken empty state.
EVIDENCE: Screenshots of call history and call detail view.

### GATE: dashboard/customer_management_works
TIME: ~5 min
STEPS:
1. Navigate to /app/leads or /app/customers
2. Can you SEE existing customers/leads? Are they listed with useful info?
3. ADD: Can you add a new customer? (name, phone, email, notes)
4. SEARCH: Can you search for a customer by name or phone?
5. VIEW: Click a customer — does it show their history (calls, bookings, notes)?
6. EDIT: Can you update customer info? Does it save?
7. Check: Are customers tagged with lead temperature or source?
8. Check: Is the customer list paginated for large numbers?
PASS IF: Can add, search, view, and edit customers. Data persists.
FAIL IF: Can't add customers, search broken, edit doesn't save.
EVIDENCE: Screenshots of customer management workflow.

### GATE: dashboard/mode_specific_features_work
TIME: ~8 min
STEPS (mode-specific — test the features listed in the QA prompt for your current mode):
SERVICE MODE:
- Appointment calendar view (day/week/month) shows bookings
- Quick Book button creates appointment
- Emergency alerts section exists
- Customer history shows past service calls

DISPATCH MODE:
- Map view renders (even without real drivers)
- Job creation workflow works (create job, set location, assign driver if possible)
- Pricing calculator shows estimates
- Fleet management page loads with add/edit vehicle capability

FOOD MODE:
- Kitchen display shows orders (or meaningful empty state)
- Menu management: add/edit menu items, set prices, categories
- Reservation system: create/view reservations
- Order queue with status filtering

MEDICAL MODE:
- Patient intake form builder or viewer exists
- Provider schedule management
- Appointment types configuration
- HIPAA indicators visible (no PHI in plain view)

SALES MODE:
- Lead pipeline with stage columns (new, qualified, proposed, won/lost)
- Can move leads between stages (drag or click)
- Estimate/quote creation
- Test drive scheduling (if automotive)

GENERAL MODE:
- Message log captures calls
- Callback queue shows pending callbacks
- Basic routing configuration accessible

PASS IF: Mode-specific features exist AND function (not just load).
FAIL IF: Key features missing, broken, or non-functional.
EVIDENCE: Screenshots of each mode-specific feature tested.

### GATE: dashboard/empty_states_guide_user
TIME: ~3 min
STEPS:
1. Look at each dashboard page as if you were a brand new user with NO data
2. For each page with no data, check:
   - Is there a helpful message? (not just "No data" or blank space)
   - Is there a CTA? ("Make your first test call", "Add your first service", etc.)
   - Does it explain what will appear here once the business is active?
3. Key pages to check: Dashboard home, Bookings/Jobs, Calls, Customers, Reports
4. Check: Is there a "Test Call" button prominent on the dashboard?
PASS IF: Every empty state provides guidance and clear next steps.
FAIL IF: Any page shows blank space, "No data", or no guidance for new users.
EVIDENCE: Screenshots of empty states with notes on what's helpful/missing.

### GATE: dashboard/mobile_375px_usable
TIME: ~5 min
VIEWPORT: 375px width
STEPS:
1. Set viewport to 375px
2. Navigate to dashboard
3. Check: Key stats visible? Cards not overlapping? Navigation accessible?
4. Visit ALL main pages: Dashboard, Bookings, Calls, Brain, Settings
5. On each page:
   - Text readable? Buttons tappable? No horizontal scroll?
   - Tables scrollable or responsive? (not cut off)
   - Modals/dialogs fit on screen?
6. Check mobile navigation: hamburger menu opens, links work, closes properly
PASS IF: All dashboard pages usable at 375px.
FAIL IF: Any page has horizontal overflow, unreachable buttons, or unreadable text.
EVIDENCE: Screenshots of each page at 375px.

---

## SETTINGS GATES (4 gates — browser tests)

### GATE: settings/business_hours_save_and_enforce
TIME: ~6 min
STEPS:
1. Navigate to settings (find business hours section)
2. Note current hours for Monday
3. CHANGE Monday hours (e.g., from 9-5 to 8-6)
4. Click Save
5. Navigate away (go to Dashboard)
6. Navigate back to Settings
7. Verify Monday hours show 8-6 (not reverted to 9-5)
8. Refresh the page (F5)
9. Verify hours still show 8-6
10. BACKEND CHECK: Verify the hours are stored in the database
    - The business brain / tenant config should reflect the new hours
    - If the AI builds context from hours_json, verify the data is correct
11. STRETCH: If possible, verify the AI would respect these hours during calls
    - Check the build-business-brain or get-business-context edge function
PASS IF: Hours save, persist across navigation/refresh, AND are stored correctly for AI consumption.
FAIL IF: Hours revert, don't save, or aren't stored where the AI can read them.
EVIDENCE: Screenshots before/after + database verification.

### GATE: settings/phone_number_displays_correctly
TIME: ~2 min
STEPS:
1. Navigate to dashboard and/or settings
2. Find where the AI receptionist's phone number is displayed
3. Verify:
   - Phone number IS visible (not hidden or "Not configured")
   - Format is clean: (555) 123-4567 or +1 (555) 123-4567
   - It's clear this is "your AI receptionist number" — the one customers call
4. Is it easy to find? (not buried 3 clicks deep)
5. Can you click to copy it?
PASS IF: Phone number displayed clearly, formatted correctly, easy to find.
FAIL IF: Number missing, hidden, poorly formatted, or hard to find.
EVIDENCE: Screenshot showing phone number location and format.

### GATE: settings/all_settings_persist_after_refresh
TIME: ~6 min
STEPS:
1. Navigate to Settings
2. Go through EVERY settings sub-page/tab that exists:
   - General/Profile settings
   - Business hours
   - Notification preferences
   - Team members
   - SMS configuration
   - AI behavior settings
   - Any other settings pages
3. On EACH page: change at least one setting, save it
4. Navigate away from Settings entirely
5. Come back to Settings
6. Verify ALL changes persisted
7. F5 refresh
8. Verify ALL changes still there
9. Record which settings pages exist and which ones save properly
PASS IF: Every settings page saves correctly, changes survive navigation and refresh.
FAIL IF: Any settings page doesn't save, or changes revert.
EVIDENCE: List of all settings pages tested with save status for each.

### GATE: settings/notifications_work
TIME: ~4 min
STEPS:
1. Navigate to Settings, find notification preferences
2. Check what notification options exist:
   - Email notifications for new bookings?
   - SMS notifications for new calls?
   - Push notifications?
3. Toggle a notification preference on/off
4. Save. Verify it persists after navigation and refresh.
5. Check: Are the notification options relevant to this mode?
6. Check: Is it clear WHAT triggers each notification?
PASS IF: Notification preferences exist, are configurable, save properly.
FAIL IF: No notification settings, or settings don't persist.
EVIDENCE: Screenshots of notification settings with save verification.

---

## INTEGRATION GATES (3 gates — browser + backend tests)

### GATE: integrations/google_calendar_connects
TIME: ~5 min
STEPS:
1. Navigate to /app/integrations (or wherever calendar integration is)
2. Find Google Calendar integration section
3. Check:
   - Connect button or OAuth entry point EXISTS
   - Status indicator shows connected/disconnected
   - If connected: calendar selection works, can see which calendar syncs
   - If disconnected: clear instructions for connecting (not just a blank button)
4. If you CAN connect without cost: try the OAuth flow and verify it works
5. BACKEND CHECK: Verify the booking-handoff edge function includes calendar sync logic
   - Look for evidence that bookings attempt to sync to Google Calendar
   - Even if no account is connected, the system should TRY and gracefully handle "not connected"
PASS IF: Calendar integration UI exists, is functional, and backend code attempts calendar sync.
FAIL IF: Integration page broken, no calendar option, or backend has no calendar sync logic.
EVIDENCE: Screenshots of integration page + backend code evidence.

### GATE: integrations/stripe_billing_real_data
TIME: ~5 min
STEPS:
1. Navigate to billing/subscription page (check Settings, Usage, or Account)
2. Verify the page shows REAL data from Stripe:
   - Current plan name (base-200, growth-2000, etc.) or "No subscription"
   - Billing status (active, trial, canceled)
   - Usage metrics (minutes used this month)
   - Next billing date
   - Upgrade/downgrade options
3. Is ANY of this hardcoded/placeholder? (Look for "Lorem ipsum", "$0.00", "Plan Name", etc.)
4. Check plan names match actual Stripe products
5. If trial: is the trial status and end date shown accurately?
PASS IF: Billing page shows real Stripe data (or real "no subscription" state), not placeholders.
FAIL IF: All billing data is hardcoded, placeholder, or page is broken.
EVIDENCE: Screenshots of billing page.

### GATE: integrations/sms_delivery_works
TIME: ~5 min
STEPS:
1. Navigate to Settings or Integrations
2. Find SMS/Twilio configuration
3. Check:
   - Is there a phone number assigned to this tenant?
   - Is SMS enabled/disabled toggle present?
   - Is the A2P 10DLC registration status shown?
4. BACKEND CHECK: After the booking functional test creates a booking, check:
   - Does the booking-handoff edge function trigger an SMS?
   - Check the send-sms edge function — does it exist and work?
   - Check notifications table for SMS records
5. If possible: send a test SMS and verify delivery
PASS IF: SMS infrastructure exists, booking-handoff triggers SMS, delivery chain is functional.
FAIL IF: No SMS capability, or SMS toggle exists but nothing actually sends.
EVIDENCE: Screenshots of SMS settings + backend evidence of SMS dispatch.

---

## OVERALL QUALITY GATES (5 gates — browser tests)

### GATE: overall/no_console_errors
TIME: ~5 min
STEPS:
1. Open DevTools Console tab
2. Clear console
3. Navigate through these flows (in order):
   a. Login page → Dashboard
   b. Dashboard → Bookings
   c. Bookings → Business Brain
   d. Business Brain → Settings
   e. Settings → Integrations
   f. Integrations → Calls
   g. Calls → Dashboard
4. Count ALL red console errors (not warnings, not info)
5. For each error, note: which page, what error message
6. Common acceptable errors: favicon 404, minor 3rd party script warnings
7. Unacceptable errors: RLS policy errors, undefined variable, component crash, API 500s
PASS IF: Zero unacceptable console errors on all main flows.
FAIL IF: Any RLS errors, component crashes, API failures, or undefined references.
EVIDENCE: List of all errors found with page and error message.

### GATE: overall/responsive_all_breakpoints
TIME: ~8 min
VIEWPORTS: 375px, 768px, 1024px, 1440px
STEPS:
1. Pick 5 key pages: Dashboard, Business Brain, Bookings, Settings, Calls
2. For EACH page, test at ALL 4 viewports:
   - 375px: No horizontal scroll, buttons tappable, text readable
   - 768px: Layout adjusts, nothing breaks, sidebars collapse properly
   - 1024px: Full layout visible, no wasted space
   - 1440px: Content fills properly, no ultra-wide stretching
3. At each size check: does the page actually FUNCTION? (not just render)
4. Record any breakpoint-specific issues
PASS IF: All 5 pages work at all 4 breakpoints without layout issues.
FAIL IF: Any page at any breakpoint has overflow, unreadable text, or unreachable controls.
EVIDENCE: Screenshots of key pages at each breakpoint.

### GATE: overall/login_to_live_under_5_min
TIME: ~5 min
STEPS:
1. Start at the login page
2. Log in as admin
3. Map the ENTIRE path from "I just logged in" to "My AI is live and answering calls":
   a. How many clicks to reach the dashboard?
   b. Is it immediately clear what my AI's phone number is?
   c. Is it immediately clear if my AI is active or paused?
   d. Is there a prominent "Go Live" / "Activate" button?
   e. Can I make a test call from the dashboard?
4. Count total clicks required
5. Check for dead ends (pages with no clear next step)
6. Check: Would a new user know what to do?
PASS IF: Clear, linear path from login to active AI. Under 5 minutes, under 10 clicks.
FAIL IF: Path is unclear, has dead ends, takes too many steps, or requires guesswork.
EVIDENCE: Step-by-step path documented with click count.

### GATE: overall/non_technical_usable
TIME: ~5 min
STEPS:
1. Navigate the ENTIRE app with your persona's mindset
2. For EACH page: "Would [persona] know what to do here?"
3. Check for:
   - Technical jargon (API, webhook, endpoint, DNS, CNAME, OAuth, etc.)
   - Developer terminology disguised as user features
   - Unclear buttons (what does "Configure Agent" mean to a plumber?)
   - Missing help text on complex features
   - Assumed knowledge ("business brain" — would a plumber know what that is?)
   - Overwhelming density (too many options on one screen)
4. Pay special attention to: Business Brain, Integrations, Settings, AI configuration
5. Record every instance where a non-technical user would be stuck
PASS IF: A non-technical business owner can use all key features unassisted.
FAIL IF: Any critical flow requires technical knowledge or is ambiguous.
EVIDENCE: Complete list of usability issues by page.

### GATE: overall/error_states_have_recovery
TIME: ~4 min
STEPS:
1. Navigate to an invalid URL (e.g., /app/nonexistent)
   - Does a friendly 404 page show? Is there a "Go Home" link?
2. Try submitting a form with empty required fields
   - Are error messages clear and specific? (not just "Error" or red borders)
3. Check the network tab — if an API call fails:
   - Does the UI show a retry option?
   - Or does it just silently fail?
4. Try to trigger an error boundary (if possible):
   - Rapidly navigate between pages
   - Open the app in two tabs and modify data in one
5. Check: Do error messages tell the user WHAT WENT WRONG and WHAT TO DO?
PASS IF: All error states show recovery paths with clear, human-readable messages.
FAIL IF: Raw technical errors shown, blank screens on error, or no recovery option.
EVIDENCE: Screenshots of error states found.

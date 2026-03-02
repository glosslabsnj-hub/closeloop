# QA Test Scripts — All 37 Gates

Each gate has an exact test procedure. Follow the steps literally. Do not improvise.

App URL: https://app.getfluxdata.com
Admin login: jackangelini@icloud.com / test1234 (fallback: Moochie1245!)

---

## ONBOARDING (8 gates)

### GATE: onboarding/phases_load_no_errors
TIME: ~3 min
URL: /app/onboarding
STEPS:
1. Navigate to /app/onboarding
2. Verify Phase 1 renders (industry selection visible, no console errors)
3. Select an industry (e.g., "Plumbing")
4. Click "Next" — verify Phase 2 loads (business basics form)
5. Fill required fields (business name, address, phone)
6. Click "Next" — verify Phase 3 loads (service configuration)
7. Click "Next" — verify Phase 4 loads (AI personality)
8. Click "Next" — verify Phase 5 loads (review & activate)
9. DO NOT click "Complete" (triggers Twilio provisioning)
PASS IF: All 5 phases render without errors, progress bar advances correctly
FAIL IF: Any phase shows error, blank screen, or console error
EVIDENCE: Screenshot of each phase transition

### GATE: onboarding/questions_relevant_to_mode
TIME: ~5 min
URL: /app/onboarding
STEPS:
1. Start onboarding flow for current target mode
2. For EACH question on every phase, ask: "Would a {mode} business owner need to answer this?"
3. Flag any question that makes no sense for the mode (e.g., "menu items" for a plumber)
4. Flag any question that uses generic language instead of mode-specific (e.g., "appointments" when mode is dispatch and should say "jobs")
5. Record every irrelevant question with its phase number and field label
PASS IF: Every question is relevant and makes sense for the target mode
FAIL IF: Any question is irrelevant, confusing, or mode-inappropriate
EVIDENCE: List of all questions reviewed with relevance assessment

### GATE: onboarding/no_redundant_questions
TIME: ~4 min
URL: /app/onboarding
STEPS:
1. Walk through all onboarding phases
2. For each question, check if the SAME information is asked elsewhere in the flow
3. Check if any question duplicates information already in the business brain or settings
4. Record any duplicates found with their phase numbers
PASS IF: Each piece of information is asked only once
FAIL IF: Same information is requested in multiple places
EVIDENCE: List of all questions with duplicate check results

### GATE: onboarding/correct_terminology
TIME: ~4 min
URL: /app/onboarding
STEPS:
1. Walk through all onboarding phases
2. Check every label, heading, button, and placeholder text
3. Verify terminology matches the mode:
   - SERVICE: "appointments", "services", "customers"
   - DISPATCH: "jobs", "drivers", "dispatches"
   - FOOD: "orders", "menu items", "customers"
   - MEDICAL: "intakes", "patients", "providers"
   - SALES: "leads", "opportunities", "prospects"
4. Flag any generic or wrong-mode terms
PASS IF: All text uses correct mode-specific terminology
FAIL IF: Any label, heading, or text uses wrong mode terms
EVIDENCE: Screenshots of correct/incorrect terminology found

### GATE: onboarding/smart_defaults_prefilled
TIME: ~3 min
URL: /app/onboarding
STEPS:
1. Start onboarding, select the target mode industry
2. On each phase, check: are obvious defaults pre-filled?
3. For SERVICE mode examples: business hours 8-5 M-F, service area radius, on-site service = yes
4. For DISPATCH mode examples: 24/7 availability, dispatch radius, real-time tracking = yes
5. Check that defaults are sensible, not just empty fields
PASS IF: Obvious defaults are pre-populated and appropriate for the mode
FAIL IF: Fields that should have obvious defaults are blank
EVIDENCE: Screenshots showing pre-filled vs empty fields

### GATE: onboarding/under_5_minutes
TIME: ~5 min
URL: /app/onboarding
STEPS:
1. Start a timer
2. Walk through onboarding filling in realistic data (not rushing, not dawdling)
3. Fill every required field with plausible business data
4. Stop timer at the review phase (do NOT click Complete)
5. Record total time
PASS IF: Completed in under 5 minutes with no confusion or backtracking
FAIL IF: Takes more than 5 minutes, or user would get stuck/confused
EVIDENCE: Time recorded, note any steps that caused delay

### GATE: onboarding/mobile_375px
TIME: ~4 min
URL: /app/onboarding
VIEWPORT: 375px width
STEPS:
1. Set browser viewport to 375px width
2. Navigate to /app/onboarding
3. Walk through each phase checking:
   - All buttons visible and tappable (not cut off by viewport)
   - Text readable (not overflowing or truncated)
   - Form fields accessible (not overlapping)
   - Progress bar visible
   - "Next"/"Back" buttons reachable without scrolling sideways
4. Try to complete the flow at mobile size
PASS IF: All phases usable at 375px, no horizontal scroll needed, buttons tappable
FAIL IF: Any element is cut off, unreachable, or requires horizontal scrolling
EVIDENCE: Screenshots at 375px of each phase

### GATE: onboarding/non_technical_usable
TIME: ~5 min
URL: /app/onboarding
STEPS:
1. Walk through onboarding with the mindset of a 55-year-old plumber who barely uses apps
2. For each screen ask: "Would Mike understand what to do without help?"
3. Check: Are there clear instructions? Is the "Next" button obvious? Are labels plain English?
4. Check: Are there any technical terms (API, webhook, endpoint, DNS, etc.)?
5. Check: Is there help text or tooltips for complex fields?
6. Flag anything that would make a non-technical person call for help
PASS IF: A non-technical person could complete onboarding unassisted
FAIL IF: Any step requires technical knowledge or is ambiguous
EVIDENCE: Notes on each step's clarity for non-technical users

---

## BUSINESS BRAIN (6 gates)

### GATE: business_brain/relevant_sections_only
TIME: ~3 min
URL: /app/business-brain
STEPS:
1. Navigate to /app/business-brain (or Business Brain page)
2. List every visible section/tab
3. For each section, verify it's relevant to the target mode:
   - SERVICE: should show services, hours, service area, pricing, booking rules
   - DISPATCH: should show dispatch rules, coverage, driver management, job types
   - FOOD: should show menu, hours, delivery settings, order management
   - MEDICAL: should show intake forms, providers, appointment types
   - SALES: should show lead stages, qualification criteria, follow-up rules
4. Flag any section that doesn't belong in this mode
PASS IF: Only mode-relevant sections are visible
FAIL IF: Sections from other modes are showing (e.g., "Menu" for a plumber)
EVIDENCE: Screenshot of all visible sections with relevance assessment

### GATE: business_brain/irrelevant_sections_hidden
TIME: ~3 min
URL: /app/business-brain
STEPS:
1. Open Business Brain for the target mode
2. Verify sections from OTHER modes are NOT visible:
   - SERVICE mode should NOT show: menu, dispatch, intake forms, lead pipeline
   - DISPATCH mode should NOT show: menu, intake forms, services catalog
   - FOOD mode should NOT show: dispatch rules, intake forms, services catalog
3. Check DOM (if needed) that hidden sections are truly removed, not just display:none with data leaking
PASS IF: No irrelevant sections are visible in the UI
FAIL IF: Any section from another mode is visible or accessible
EVIDENCE: Screenshots proving absence of irrelevant sections

### GATE: business_brain/settings_save_persist
TIME: ~4 min
URL: /app/business-brain
STEPS:
1. Open Business Brain
2. Change a setting (e.g., business name, hours, a service description)
3. Click Save
4. Verify save confirmation appears
5. Navigate AWAY from the page (go to Dashboard or Settings)
6. Navigate BACK to Business Brain
7. Verify the changed setting is still there (not reverted)
8. Refresh the browser (F5)
9. Verify the setting persists after refresh
PASS IF: Settings save, survive navigation, and survive page refresh
FAIL IF: Settings revert on navigation or refresh
EVIDENCE: Screenshots showing the value before save, after save, and after navigation back

### GATE: business_brain/smart_defaults_populated
TIME: ~3 min
URL: /app/business-brain
STEPS:
1. Open Business Brain for a newly onboarded tenant (or check current defaults)
2. For each section, check if defaults are populated:
   - SERVICE: default services list, standard hours, common FAQs
   - DISPATCH: default job types, response time expectations
   - FOOD: sample menu categories, standard hours
3. Check that defaults are realistic and useful, not placeholder text
PASS IF: Smart defaults are pre-populated with mode-appropriate values
FAIL IF: Sections are empty or have generic placeholder text
EVIDENCE: Screenshots of default values in each section

### GATE: business_brain/advanced_tucked_away
TIME: ~3 min
URL: /app/business-brain
STEPS:
1. Open Business Brain
2. Verify the initial view shows only basic/essential settings
3. Check that advanced settings (AI behavior, integration configs, custom rules) are:
   - Behind an "Advanced" toggle or section
   - In a sub-page or expandable section
   - NOT shown by default on the main view
4. Verify Mike the plumber would NOT be overwhelmed by the first screen
PASS IF: Basic settings are front and center, advanced settings are hidden but accessible
FAIL IF: Advanced settings crowd the main view or all settings are shown at once
EVIDENCE: Screenshots of default view vs expanded/advanced view

### GATE: business_brain/mobile_375px
TIME: ~4 min
URL: /app/business-brain
VIEWPORT: 375px width
STEPS:
1. Set viewport to 375px
2. Navigate to Business Brain
3. Check every section:
   - Text readable, not truncated
   - Edit buttons/controls tappable
   - No horizontal overflow
   - Save button always reachable
   - Settings forms usable (input fields not too small)
4. Try editing and saving a setting at mobile width
PASS IF: All brain sections usable at 375px, can edit and save
FAIL IF: Any section overflows, buttons unreachable, or forms unusable
EVIDENCE: Screenshots at 375px of each brain section

---

## DASHBOARD (6 gates)

### GATE: dashboard/meaningful_empty_state
TIME: ~3 min
URL: /app/dashboard
STEPS:
1. Navigate to /app/dashboard
2. If no calls/data exist, check the empty state:
   - Is there a helpful message (not just "No data")?
   - Is there a "Make a test call" or "Get started" CTA?
   - Does it explain what will appear here once active?
3. If data exists, temporarily note what shows and check if a new tenant would see guidance
PASS IF: Empty state guides the user with clear next steps and CTAs
FAIL IF: Shows blank area, "No data", or no guidance for new users
EVIDENCE: Screenshot of empty state with annotation of what's helpful/missing

### GATE: dashboard/test_call_cta_prominent
TIME: ~2 min
URL: /app/dashboard
STEPS:
1. Navigate to dashboard
2. Look for a "Test Call" or "Make a Test Call" or "Try Your AI" button/CTA
3. Verify it's prominent (not buried in a menu)
4. Verify it's above the fold (visible without scrolling)
5. If it exists, note its position and visibility
PASS IF: Test call CTA is visible, prominent, and above the fold
FAIL IF: No test call CTA, or it's buried/hidden
EVIDENCE: Screenshot showing CTA location and prominence

### GATE: dashboard/call_history_displays
TIME: ~3 min
URL: /app/dashboard or /app/calls
STEPS:
1. Navigate to dashboard or calls page
2. Check if call history section exists
3. If calls exist: verify they show caller name/number, time, duration, outcome
4. If no calls: verify empty state is meaningful (not broken)
5. Check that call entries are clickable for details
6. Verify chronological ordering (newest first)
PASS IF: Call history displays correctly with proper data, or shows meaningful empty state
FAIL IF: Call data is missing, malformed, or the section doesn't exist
EVIDENCE: Screenshot of call history (or empty state)

### GATE: dashboard/mobile_375px
TIME: ~5 min
URL: /app/dashboard (and all sub-pages)
VIEWPORT: 375px width
STEPS:
1. Set viewport to 375px
2. Navigate to dashboard
3. Check: key metrics visible without scrolling, cards not overlapping
4. Navigate to EVERY dashboard sub-page (calls, bookings, settings, etc.)
5. On each page: check text readability, button reachability, no horizontal scroll
6. Check that the navigation menu works at mobile (hamburger menu opens, links work)
PASS IF: All dashboard pages usable at 375px
FAIL IF: Any page has horizontal overflow, unreachable buttons, or unreadable text
EVIDENCE: Screenshots of each dashboard page at 375px

### GATE: dashboard/navigation_complete
TIME: ~3 min
URL: /app/dashboard
STEPS:
1. From the dashboard, click every link in the navigation (sidebar/header)
2. Verify every link leads to a real page (no 404s, no blank screens)
3. Verify every page in the nav has a working back-path to dashboard
4. Check for orphan pages (pages that exist but have no nav link)
5. Verify active state: current page is highlighted in nav
PASS IF: All nav links work, no dead links, no orphan pages
FAIL IF: Any link leads to 404, blank screen, or error
EVIDENCE: List of all nav items tested with results

### GATE: dashboard/correct_terminology
TIME: ~3 min
URL: /app/dashboard
STEPS:
1. Navigate to dashboard and all sub-pages
2. Check every heading, label, button, and data column for correct mode terminology:
   - SERVICE: "Appointments", "Customers", "Services"
   - DISPATCH: "Jobs", "Drivers", "Dispatches"
   - FOOD: "Orders", "Menu", "Customers"
3. Flag any generic terms that should be mode-specific
PASS IF: All dashboard text uses correct mode-specific terms
FAIL IF: Any text uses wrong-mode or generic terms
EVIDENCE: Screenshots of correct/incorrect terminology

---

## OVERALL (5 gates)

### GATE: overall/login_to_live_path_clear
TIME: ~5 min
URL: /app
STEPS:
1. Start at the login page
2. Log in as admin
3. Map the path from "I just logged in" to "My AI receptionist is live and answering calls"
4. Count the number of clicks/steps required
5. Check: Is each step obvious? Is the next action always clear?
6. Check: Is there a "Go Live" or "Activate" button that's easy to find?
7. Note any dead ends or confusion points
PASS IF: Clear, linear path from login to active AI with no confusion
FAIL IF: Path is unclear, has dead ends, or requires guesswork
EVIDENCE: Step-by-step path documented with click count

### GATE: overall/error_states_recovery
TIME: ~4 min
URL: /app (various pages)
STEPS:
1. Try navigating to invalid URLs (e.g., /app/nonexistent)
2. Check: does a friendly error page show? Is there a "Go back" link?
3. Try submitting a form with empty required fields
4. Check: are error messages clear and specific (not just "Error")?
5. If an API call fails (check network tab), verify the UI shows a retry option
6. Check that ErrorBoundary catches component crashes (if possible to trigger)
PASS IF: All error states show recovery paths with clear messaging
FAIL IF: Errors show raw technical messages, blank screens, or no recovery option
EVIDENCE: Screenshots of error states found

### GATE: overall/responsive_all_breakpoints
TIME: ~6 min
URL: /app (multiple pages)
VIEWPORTS: 375px, 768px, 1024px, 1440px
STEPS:
1. Pick 4 key pages: Dashboard, Business Brain, Onboarding Phase 1, Settings
2. For each page, test at all 4 breakpoints
3. At each breakpoint check: no horizontal scroll, text readable, buttons clickable, layout makes sense
4. Record any breakpoint-specific issues
PASS IF: All 4 pages work at all 4 breakpoints without layout issues
FAIL IF: Any page at any breakpoint has overflow, unreadable text, or unreachable controls
EVIDENCE: Screenshots of each page at each breakpoint (16 screenshots)

### GATE: overall/no_visual_glitches
TIME: ~4 min
URL: /app (multiple pages)
STEPS:
1. Navigate through Dashboard, Business Brain, Onboarding, Settings, Calls
2. On each page look for:
   - Broken or missing images/icons
   - Overlapping elements
   - Misaligned text or buttons
   - Inconsistent spacing or padding
   - Flash of unstyled content (FOUC)
   - Broken dark/light mode (if applicable)
3. Record every visual glitch with its page and location
PASS IF: No visual glitches on any page
FAIL IF: Any broken images, overlapping elements, or layout inconsistencies
EVIDENCE: Screenshots of any glitches found (or "clean" screenshots of each page)

### GATE: overall/non_technical_usable
TIME: ~5 min
URL: /app
STEPS:
1. Navigate the entire app with "Mike the plumber" mindset
2. For each page ask: "Would Mike know what to do here?"
3. Check for:
   - Technical jargon (API, webhook, endpoint, integration, etc.)
   - Unclear buttons (what does "Configure" mean to Mike?)
   - Missing help text on complex features
   - Assumed knowledge (does Mike know what "business brain" means?)
4. Flag every instance where a non-technical user would be confused
PASS IF: A non-technical business owner can navigate all key features unassisted
FAIL IF: Any critical flow requires technical knowledge
EVIDENCE: List of all usability issues found per page

---

## CROSS-MODE REGRESSION (5 gates)

### GATE: cross_mode/service_brain_tabs_correct
TIME: ~2 min
URL: /app/business-brain (with mode set to SERVICE)
STEPS:
1. Ensure tenant is in SERVICE mode
2. Navigate to Business Brain
3. Verify the correct tabs/sections show for service businesses
4. Verify no dispatch, food, medical, or sales tabs are leaking through
5. Verify data renders without errors
PASS IF: Only service-appropriate tabs are visible and functional
FAIL IF: Wrong tabs showing, or tabs are missing, or render errors
EVIDENCE: Screenshot of Business Brain tabs in service mode

### GATE: cross_mode/dispatch_brain_tabs_correct
TIME: ~2 min
URL: /app/business-brain (with mode set to DISPATCH)
STEPS:
1. Switch tenant to DISPATCH mode (or use a dispatch-mode tenant)
2. Navigate to Business Brain
3. Verify dispatch-specific tabs show (jobs, drivers, fleet, dispatch rules)
4. Verify no service, food, medical, or sales tabs are leaking through
5. Verify data renders without errors
PASS IF: Only dispatch-appropriate tabs are visible and functional
FAIL IF: Wrong tabs showing, or tabs are missing, or render errors
EVIDENCE: Screenshot of Business Brain tabs in dispatch mode

### GATE: cross_mode/food_brain_tabs_correct
TIME: ~2 min
URL: /app/business-brain (with mode set to FOOD)
STEPS:
1. Switch tenant to FOOD mode
2. Navigate to Business Brain
3. Verify food-specific tabs show (menu, orders, delivery, kitchen settings)
4. Verify no service, dispatch, medical, or sales tabs are leaking through
5. Verify data renders without errors
PASS IF: Only food-appropriate tabs are visible and functional
FAIL IF: Wrong tabs showing, or tabs are missing, or render errors
EVIDENCE: Screenshot of Business Brain tabs in food mode

### GATE: cross_mode/medical_brain_tabs_correct
TIME: ~2 min
URL: /app/business-brain (with mode set to MEDICAL)
STEPS:
1. Switch tenant to MEDICAL mode
2. Navigate to Business Brain
3. Verify medical-specific tabs show (intake forms, providers, appointment types)
4. Verify no service, dispatch, food, or sales tabs are leaking through
5. Verify data renders without errors
PASS IF: Only medical-appropriate tabs are visible and functional
FAIL IF: Wrong tabs showing, or tabs are missing, or render errors
EVIDENCE: Screenshot of Business Brain tabs in medical mode

### GATE: cross_mode/sales_brain_tabs_correct
TIME: ~2 min
URL: /app/business-brain (with mode set to SALES)
STEPS:
1. Switch tenant to SALES mode
2. Navigate to Business Brain
3. Verify sales-specific tabs show (lead pipeline, qualification, follow-up rules)
4. Verify no service, dispatch, food, or medical tabs are leaking through
5. Verify data renders without errors
PASS IF: Only sales-appropriate tabs are visible and functional
FAIL IF: Wrong tabs showing, or tabs are missing, or render errors
EVIDENCE: Screenshot of Business Brain tabs in sales mode

---

## CALL FLOW / FEATURES (3 gates)

### GATE: call_flow/booking_creates_correctly
TIME: ~8 min
TYPE: FUNCTIONAL (requires real AI conversation + database verification)
STEPS:
1. Run the functional test script:
   npx tsx C:/Users/jacka/lenard/scripts/qa-functional-test.ts --mode service --scenario booking --tenant test-hvac-emergency
2. Wait for the script to complete (up to 2 minutes). It will:
   - Connect to the real ElevenLabs agent via text-only WebSocket
   - Have a real conversation requesting an HVAC repair booking
   - Provide customer name "John Test" and phone "555-010-0199"
   - Wait up to 45s for the webhook to fire and booking to appear in database
3. Check the script output for PASS/FAIL result
4. If PASS: Navigate to /app/bookings in the browser and verify the test booking is visible
5. Screenshot the booking in the dashboard showing correct details
6. The script auto-cleans test data (deletes the "John Test" booking)
PASS IF: Script returns pass=true AND booking appears in both database and dashboard UI
FAIL IF: Script returns pass=false, OR conversation fails to connect, OR booking never created in database, OR booking not visible in dashboard
EVIDENCE: Script JSON output + screenshot of booking in dashboard
COST: ~$0.02-0.05 per test (ElevenLabs API). This is authorized.

### GATE: call_flow/emergency_routing_works
TIME: ~6 min
TYPE: FUNCTIONAL (requires real AI conversation to test emergency detection)
STEPS:
1. Run the functional test script:
   npx tsx C:/Users/jacka/lenard/scripts/qa-functional-test.ts --mode service --scenario emergency --tenant test-hvac-emergency
2. Wait for the script to complete. It will:
   - Connect to the real ElevenLabs agent via text-only WebSocket
   - Report a fake emergency: "My pipe burst and water is flooding my basement"
   - Check if the AI agent recognizes the emergency keywords and responds appropriately
   - Verify the conversation transcript contains emergency detection behavior
3. Check the script output: emergencyDetected should be true
4. Navigate to /app/settings or /app/business-brain in the browser
5. Find the emergency routing configuration and verify it exists
6. Verify emergency keywords are defined and forwarding number is settable
PASS IF: AI agent detects emergency in live conversation AND emergency routing is configurable in UI
FAIL IF: AI ignores emergency keywords (treats it as a normal call), OR no emergency config exists in UI
EVIDENCE: Script JSON output showing emergency detection + screenshot of emergency settings
COST: ~$0.02-0.05 per test. This is authorized.

### GATE: call_flow/sms_confirmation_sends
TIME: ~8 min
TYPE: FUNCTIONAL (requires real AI conversation + SMS dispatch verification)
STEPS:
1. Run the functional test script:
   npx tsx C:/Users/jacka/lenard/scripts/qa-functional-test.ts --mode service --scenario sms_confirmation --tenant test-hvac-emergency
2. Wait for the script to complete. It will:
   - Have a real conversation booking a "furnace inspection"
   - Provide customer "Sarah SMS-Test" with phone "555-020-0299"
   - After booking, check for SMS dispatch evidence in:
     a. notifications table (sms sent records)
     b. ai_event_logs (booking_handoff_triggered stage)
     c. booking-handoff edge function invocation
3. Check the script output for smsDispatched status
4. Navigate to /app/settings in the browser
5. Find SMS confirmation settings and verify they exist AND are configured
6. The script auto-cleans test data
PASS IF: Booking created via AI conversation AND SMS dispatch evidence found (notification or handoff log)
FAIL IF: SMS toggle exists in UI but no SMS actually dispatches after a real booking, OR script returns pass=false
EVIDENCE: Script JSON output + screenshot of SMS settings in dashboard
COST: ~$0.02-0.05 (ElevenLabs) + ~$0.01 (Twilio SMS). This is authorized.

---

## INTEGRATIONS (2 gates)

### GATE: integrations/google_calendar_syncs
TIME: ~5 min
TYPE: ENHANCED (UI check + backend verification)
STEPS:
1. Navigate to /app/integrations
2. Find Google Calendar integration
3. Verify UI exists:
   - Connect button or OAuth flow entry point exists
   - Status indicator shows connected/disconnected
   - If connected: calendar selection UI works
   - If disconnected: clear instructions for connecting
4. Check that the integration page loads without errors
5. (BACKEND CHECK) After a test booking is created by the booking functional test, verify that the booking-handoff edge function includes calendar sync logic:
   - Check ai_event_logs for any "calendar_sync" or "booking_handoff_triggered" stage entries
   - Even if no real Google account is connected, the system should ATTEMPT the sync (and gracefully handle the "not connected" case)
6. Verify the booking-handoff code path includes calendar integration (not just UI toggle)
PASS IF: Google Calendar integration UI exists AND booking-handoff code attempts calendar sync after bookings
FAIL IF: Integration page broken, or calendar sync logic is completely missing from the backend pipeline
EVIDENCE: Screenshot of integrations page + evidence of calendar sync attempt in event logs

### GATE: integrations/stripe_billing_works
TIME: ~5 min
TYPE: ENHANCED (UI check + real data verification)
STEPS:
1. Navigate to billing/subscription page (check settings, usage, or account)
2. Verify UI:
   - Current plan is displayed
   - Billing status (active, trial, etc.) is shown
   - Usage metrics are visible (minutes used, etc.)
   - Upgrade/downgrade path is clear
3. (BACKEND CHECK) Query the database to verify Stripe data is real:
   - Run: npx tsx C:/Users/jacka/lenard/scripts/sql.ts "SELECT id, stripe_customer_id, stripe_subscription_id FROM tenants WHERE slug='test-hvac-emergency' LIMIT 1"
   - (Use Supabase REST if sql.ts is lenard-only): Check tenants table for stripe fields
4. Verify: Is the billing page showing REAL data from Stripe, or is it all hardcoded placeholder text?
5. Check that plan names match actual Stripe products (base-200, growth-2000, scale-5000, power-10000)
PASS IF: Billing page shows real plan data from Stripe (or real "no subscription" state), not hardcoded placeholders
FAIL IF: All billing data is placeholder/hardcoded, or page shows fake plan names not matching Stripe
EVIDENCE: Screenshot of billing page + database query showing Stripe fields

---

## SETTINGS (2 gates)

### GATE: settings/business_hours_save
TIME: ~6 min
TYPE: ENHANCED (UI persistence + AI agent behavior verification)
STEPS:
1. Navigate to settings page
2. Find business hours configuration
3. Change a business hour (e.g., Monday from 9-5 to 8-6)
4. Click Save
5. Navigate away (go to dashboard)
6. Navigate back to settings
7. Verify the changed hours persisted
8. Refresh the page (F5) and verify again
9. (BACKEND CHECK) Verify the AI agent actually uses saved hours:
   - Query the database: check tenants.hours_json for the test tenant to confirm the new hours are persisted in the DB (not just in the UI state)
   - If time allows, run a quick functional conversation test and check if the agent's hours_today dynamic variable reflects the saved hours
   - The buildBusinessContext function should read hours_json and pass it to the AI agent as hours_today
PASS IF: Hours save in UI, persist across navigation and refresh, AND are stored correctly in tenants.hours_json (so the AI agent will use them)
FAIL IF: Hours revert, save fails, no hours config exists, OR hours save in UI but NOT in tenants.hours_json (meaning AI agent would use stale hours)
EVIDENCE: Screenshots showing hours before/after + database query showing hours_json

### GATE: settings/phone_number_displays
TIME: ~2 min
URL: /app/dashboard or /app/settings
STEPS:
1. Navigate to dashboard or settings
2. Find where the AI receptionist's phone number is displayed
3. Verify:
   - Phone number is visible (not hidden or "Not configured")
   - Format is correct (e.g., +1 (555) 123-4567)
   - It's clear this is the number customers call
4. Check that the number is easy to find (not buried in sub-menus)
PASS IF: Phone number is displayed clearly and formatted correctly
FAIL IF: Number missing, hidden, wrong format, or hard to find
EVIDENCE: Screenshot showing phone number location and format

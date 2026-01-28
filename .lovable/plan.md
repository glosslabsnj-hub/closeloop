
# Full God Audit + UX Reconfiguration Plan

## Executive Summary

After extensive code review, I've identified critical issues across data integrity, security, and UX that need addressing before this application is production-ready. The core architecture is sound, but there are gaps in data flow, module gating consistency, and user onboarding complexity.

---

## PART A: FULL PRODUCT AUDIT

### A1: DATA INTEGRITY / PERSISTENCE AUDIT

| Page | Feature | Data Source | Status | Fix Required |
|------|---------|-------------|--------|--------------|
| Dashboard | Live Dashboard | Real DB (ai_call_sessions, subscriptions) | OK | None |
| Dashboard | Setup Wizard | Real DB (assistant_settings) | OK | None |
| Inbox | Conversations | Real DB (conversations, messages) | OK | None |
| Leads | Lead List | Real DB (leads) | OK | None |
| Bookings | Booking Calendar | Real DB (bookings via useBookings) | OK | None |
| Calls | Call History | Real DB (ai_call_sessions) | PARTIAL | Call edit works but elevenlabs_conversation_id linkage unreliable |
| Orders | Order Queue | Real DB (food_orders) | OK | None |
| Dispatch | Job Queue | Real DB (dispatch_jobs) | OK | None |
| Menu Center | Menu Items | Real DB (menu_items) | OK | None |
| Reservations | Reservations | Real DB (reservations) | OK | None |
| Catering | Catering Requests | Real DB (catering_requests) | OK | None |
| Medical Intake | Intakes | Real DB (medical_intakes) | OK | None |
| Services | Service List | Real DB (services) | OK | None |
| Settings | All Tabs | Real DB (tenants, assistant_settings, availability_slots) | OK | None |
| **AdminModeSwitcher** | **Test Data Generation** | **Hardcoded test data** | **ISSUE** | **Remove from production or gate behind super_admin only** |

**Critical Finding - AdminModeSwitcher**: This component injects hardcoded test data from `industryTestData.ts` when switching modes. While useful for development, it:
- Overwrites real customer data with test records
- Creates fake call sessions with fake names
- Should be hidden from non-admin users in production

**Fix Required**:
1. Gate AdminModeSwitcher to only show for users with `super_admin` role
2. Add confirmation dialog warning about data replacement
3. Add "Clear Test Data" button to restore clean state

---

### A2: MULTI-TENANCY + RLS AUDIT (SECURITY)

**RLS Status by Table:**

| Table | RLS Enabled | Policy Pattern | Status |
|-------|-------------|----------------|--------|
| tenants | Yes | has_tenant_access | OK |
| tenant_users | Yes | user_id = auth.uid() | OK |
| assistant_settings | Yes | has_tenant_access | OK |
| ai_call_sessions | Yes | has_tenant_access | OK |
| bookings | Yes | has_tenant_access | OK |
| customers | Yes | has_tenant_access | OK |
| services | Yes | has_tenant_access | OK |
| food_orders | Yes | has_tenant_access | OK |
| dispatch_jobs | Yes | has_tenant_access | OK |
| menu_items | Yes | has_tenant_access | OK |
| reservations | Yes | has_tenant_access | OK |
| catering_requests | Yes | has_tenant_access | OK |
| medical_intakes | Yes | has_tenant_access | OK |
| order_delivery_settings | Yes | has_tenant_access | OK |
| booking_delivery_settings | Yes | has_tenant_access | OK |
| dispatch_delivery_settings | Yes | has_tenant_access | OK |
| handoff_attempts | Yes | has_tenant_access | OK |

**Security Issues Found:**

1. **Password Protection** (WARN): Leaked password protection is disabled in Supabase Auth
   - **Fix**: Enable in Supabase Auth settings

2. **Webhook Secrets**: webhook_secret fields are stored in plain text and returned to frontend
   - **Fix**: Use `SELECT` policy that excludes webhook_secret, or use a security definer function

3. **Edge Functions**: All edge functions correctly use `SUPABASE_SERVICE_ROLE_KEY` for admin operations

**Client Secret Exposure Check:**
- Twilio credentials: Never exposed to client (only in edge functions)
- ElevenLabs API keys: Never exposed to client (only in edge functions)
- Webhook secrets: Currently exposed via standard SELECT - needs fix

---

### A3: BUSINESS MODE + MODULE GATING AUDIT

**Gating Matrix:**

| Mode | Default Modules | Nav Tabs Shown | Hidden Tabs |
|------|----------------|----------------|-------------|
| service | ai_voice, booking | Dashboard, Inbox, Calls, Leads, Bookings, Services, Automations, AI Assistant, Simulator, Settings | Orders, Menu, Reservations, Catering, Dispatch, Medical |
| dispatch | ai_voice, dispatch_queue | Dashboard, Inbox, Calls, Leads, Dispatch, Services, Automations, AI Assistant, Simulator, Settings | Orders, Menu, Reservations, Catering, Bookings, Medical |
| food | ai_voice, food_orders, menu_knowledge, reservations, catering | Dashboard, Inbox, Calls, Leads, Orders, Menu, Reservations, Catering, Services, Automations, AI Assistant, Simulator, Settings | Bookings, Dispatch, Medical |
| medical | ai_voice, booking, medical_intake | Dashboard, Inbox, Calls, Leads, Bookings, Medical Intake, Services, Automations, AI Assistant, Simulator, Settings | Orders, Menu, Reservations, Catering, Dispatch |
| general | ai_voice | Dashboard, Inbox, Calls, Leads, Services, Automations, AI Assistant, Simulator, Settings | All module-specific tabs |

**Gating Implementation Review:**

| Component | Gating Method | Status |
|-----------|---------------|--------|
| AppLayout nav | `requiredModules` filter | OK |
| Settings tabs | `useFoodMode`, `useModuleEnabled` | OK |
| OrdersPage | Route accessible if food_orders enabled | OK |
| DispatchPage | Route accessible if dispatch_queue enabled | OK |
| Edge functions | twilio-inbound checks business_mode | OK |
| elevenlabs-webhook | Checks business_mode for food order creation | OK |

**Issues Found:**

1. **Route Protection Missing**: Direct URL access to gated routes (e.g., `/app/orders` for non-food tenant) shows the page but with no data. Should redirect to dashboard.
   - **Fix**: Add route guards in AppLayout or individual pages

2. **Calls tab visibility**: Currently gated by `ai_voice` module, but `ai_voice` is enabled for all modes by default, so it's always visible. This is correct behavior.

---

### A4: TELEPHONY AUDIT (TWILIO)

**Call Lifecycle:**

```
text
Inbound Call → Twilio Webhook → twilio-inbound Edge Function
                                      ↓
                            Parse To/From numbers
                                      ↓
                            Lookup tenant by To number
                                      ↓
                            Fetch business context
                                      ↓
                            Create ai_call_sessions record
                                      ↓
                            Call ElevenLabs register-call API
                                      ↓
                            Return TwiML to Twilio
                                      ↓
                            ElevenLabs handles conversation
                                      ↓
                            elevenlabs-webhook receives post-call data
                                      ↓
                            Update ai_call_sessions with transcript/summary
```

**Audit Results:**

| Check | Status | Notes |
|-------|--------|-------|
| Always returns HTTP 200 | OK | All error paths return valid TwiML |
| Always returns valid TwiML | OK | hangupTwiml helper ensures valid XML |
| Phone normalization | OK | Twilio provides E.164 format |
| Tenant lookup by To | OK | Uses phone_numbers table |
| Idempotent provisioning | OK | Checks existing numbers before purchase |
| Call session creation | OK | Creates record before ElevenLabs call |
| connect_status update | OK | Updates to forwarding_verified on first call |

**Issues Found:**

1. **Missing elevenlabs_conversation_id**: The twilio-inbound function creates the call session BEFORE calling ElevenLabs, but doesn't receive the conversation_id back from the register-call response. This makes the elevenlabs-webhook lookup unreliable.
   - **Fix**: Parse the ElevenLabs register-call response for conversation_id and update the call session

2. **Race Condition**: If ElevenLabs webhook fires before the call session is fully committed, lookup fails.
   - **Fix**: elevenlabs-webhook has fallback lookup by caller_phone + tenant_id + recent timestamp (already implemented)

---

### A5: ELEVENLABS AUDIT (VOICE AGENT)

**Dynamic Variables Contract Check:**

| Variable | Required | Status | Notes |
|----------|----------|--------|-------|
| tenant_id | Yes | PASS | Always set |
| business_name | Yes | PASS | Defaults to "Our Business" if null |
| business_mode | Yes | PASS | Defaults to "general" |
| enabled_modules | Yes | PASS | Converted to comma-separated string |
| hipaa_mode | Yes | PASS | Boolean, defaults to false |
| caller_phone | Yes | PASS | From Twilio |
| hours_today | Yes | PASS | Computed from hours_json |
| booking_link | Conditional | PASS | Empty string if not applicable |
| service_summary | Conditional | PASS | Built for service/dispatch/general |
| menu_summary | Conditional | PASS | Built for food mode |
| policies_summary | Optional | PASS | Built from policies |
| greeting_script | Optional | PASS | From ai_assistants table |
| fallback_script | Optional | PASS | From ai_assistants table |

**Null Safety Check:**
- All optional fields default to empty string `""` instead of null
- Arrays converted to comma-separated strings
- No nulls passed to ElevenLabs

**HIPAA Mode Check:**
- `redactForHipaa()` function strips caller_phone from stored context_json
- context_json stored with `[REDACTED]` for caller_phone
- Transcripts/recordings not stored by default (ElevenLabs setting, not code-controlled)

**Issue Found:**

1. **ElevenLabs Agent Prompt Configuration**: The dynamic variables are injected, but the agent's system prompt in ElevenLabs dashboard must be configured to use them properly. This is outside code control but critical for behavior.
   - **Action**: Document required ElevenLabs agent prompt template

---

### A6: FOOD ORDER HANDOFF + PRINTING AUDIT

| Feature | Status | Notes |
|---------|--------|-------|
| Food pages gating | OK | useFoodMode hook checks business_mode and modules |
| Order auto-confirm | PARTIAL | elevenlabs-webhook creates orders, but relies on AI data_collection |
| Handoff destinations | OK | order-handoff supports webhook, email, sms |
| HMAC signatures | OK | X-CloseLoop-Signature header with SHA-256 |
| Special instructions prominence | OK | OrderTicket component highlights them |
| Print formats | OK | 80mm thermal and letter supported |
| Delivery failure retry | PARTIAL | handoff_attempts logged, but retry UI not fully wired |

**Issues Found:**

1. **Order Creation from AI**: elevenlabs-webhook only creates orders if `order_confirmed` or `order_items` exists in data_collection. This requires proper ElevenLabs agent configuration.

2. **Print auto-trigger**: OrderTicketPage has `auto=true` query param support but doesn't auto-trigger print dialog
   - **Fix**: Add useEffect to trigger window.print() when auto=true

---

### A7: BOOKING + DISPATCH HANDOFF AUDIT

| Feature | Status | Notes |
|---------|--------|-------|
| Booking delivery settings gating | OK | useModuleEnabled("booking") |
| Dispatch delivery settings gating | OK | useModuleEnabled("dispatch_queue") |
| Handoff edge functions | OK | booking-handoff, dispatch-handoff exist |
| Webhook signatures | OK | HMAC SHA-256 |
| Internal source of truth | OK | Records always saved to DB first |
| Urgent SMS for dispatch | OK | urgent_sms_phone field exists |

**Issues Found:**

1. **Handoff not auto-triggered**: The handoff functions exist but are not automatically called when a booking or dispatch job is created. They need to be invoked.
   - **Fix**: Add database triggers or call from frontend mutation

---

### A8: HIPAA ISOLATION AUDIT (MEDICAL ONLY)

| Check | Status | Notes |
|-------|--------|-------|
| Medical pages gating | OK | medical_intake module required |
| hipaa_mode flag | OK | Set in tenant record |
| Caller phone redaction | OK | redactForHipaa() in twilio-inbound |
| Transcript storage | UNCLEAR | Controlled by ElevenLabs settings, not code |
| Recording storage | UNCLEAR | Controlled by ElevenLabs settings, not code |
| PHI minimization | PARTIAL | Summaries are AI-generated, no PHI filter |

**Issues Found:**

1. **HIPAA settings UI missing**: No UI for tenants to configure their HIPAA preferences (store_transcripts, store_recordings toggles)
   - **Fix**: Add HIPAA settings to medical tenant Settings page

---

## PART B: UX RECONFIGURATION

### B1: "10-MINUTE GO LIVE" FLOW (REWORK)

**Current Flow (Too Complex):**
1. Signup → 8-step onboarding → Go-Live (plan selection) → Dashboard
2. 8 steps is overwhelming for mobile users
3. Industry selection doesn't clearly connect to business_mode

**Proposed Simplified Flow:**

```
text
Step 1: Business Basics (3 fields)
        - Business Name
        - Phone Number
        - Timezone

Step 2: Industry + Mode Selection
        - Select industry template (pre-populates data)
        - Auto-maps to business_mode
        - Shows what modules will be enabled

Step 3: Plan Selection
        - Text / Voice / Both
        - 7-day trial starts

Step 4: Quick Setup Wizard (Dashboard)
        - Connect Phone (carrier forwarding OR provision number)
        - Test AI Call (browser test)
        - Configure Booking/Calendar (optional)
        - Go Live toggle

Total: 4 screens instead of 8+
```

**Implementation:**
1. Simplify OnboardingPage to 2 essential steps
2. Move service/FAQ/policy setup to post-signup "Business Brain" page
3. Add skip options with sensible defaults
4. Use industry templates to pre-populate all optional data

---

### B2: "BUSINESS BRAIN" REDESIGN

**Goal**: Single control center for AI knowledge that non-technical owners understand

**Components:**

1. **AI Readiness Score (0-100)**
   - Calculated from: business identity completeness, services count, FAQ count, hours set, policies defined
   - Visual progress bar with color coding (red < 40, yellow < 70, green >= 70)

2. **"What AI Knows" Preview Panel**
   - Collapsible JSON viewer showing compiled context
   - "Test what AI will say" button → opens simulator

3. **Editable Sections (Cards)**
   - Identity & Hours (always shown)
   - Services & Pricing (service/dispatch/general) OR Menu (food)
   - Policies (cancellation, deposit, payment methods)
   - FAQs (with "Add FAQ" quick action)
   - Objection Handling
   - Intake Questions (what info to collect)
   - "Do NOT say/promise" list

4. **Knowledge Gaps Inbox**
   - Questions AI couldn't answer (from knowledge_gaps table)
   - One-click actions: "Add as FAQ", "Add to Policy", "Ignore"
   - Shows frequency count

5. **Import Options**
   - "Paste website URL" → extract FAQs/services (future)
   - "Paste menu text" → parse menu items (food mode)
   - "Upload PDF" → extract policies (future)

**Database Mapping:**
- Readiness score: Computed from useBusinessContext hook
- Knowledge gaps: knowledge_gaps table
- All editable data: existing tables (services, business_faqs, etc.)

---

### B3: DASHBOARD SIMPLIFICATION BY MODE

**Service Mode - "Today" View:**
- Calls today (with quick view)
- Upcoming bookings (next 3)
- Pending deposits
- AI status (on/off toggle)

**Dispatch Mode - "Today" View:**
- Urgent jobs (priority filter)
- Active jobs (status filter)
- Available crews
- AI status

**Food Mode - "Today" View:**
- Pending orders
- Today's reservations
- Catering inquiries
- AI status

**Medical Mode - "Today" View:**
- Pending intakes
- Today's appointments
- Urgent escalations
- AI status + HIPAA badge

**General Mode - "Today" View:**
- Recent calls
- Pending callbacks
- AI status

**Implementation:**
- Create `DashboardByMode` component that renders mode-specific widgets
- Hide advanced settings behind "Advanced" expandable section
- Keep QuickStatsCard but customize metrics by mode

---

### B4: MOBILE-FIRST UX FIXES

| Issue | Current State | Fix |
|-------|---------------|-----|
| Onboarding on mobile | 8 steps, lots of scrolling | Reduce to 2 core steps |
| Tab overflow in Settings | Horizontal scroll, hard to tap | Use dropdown or accordion on mobile |
| Order ticket printing | Opens new page | Show "Print not available on mobile, email ticket instead" |
| Table views on mobile | Horizontal scroll | Use card view on mobile, table on desktop |
| Bottom nav | Fixed 5 items | Make scrollable or use hamburger menu |

---

## PART C: PRIORITIZED FIX LIST

### P0 (Critical - Must Fix Before Production)

| ID | Issue | Fix | Effort |
|----|-------|-----|--------|
| P0-1 | AdminModeSwitcher visible to all users | Gate to super_admin role only | 30m |
| P0-2 | Missing elevenlabs_conversation_id linkage | Parse register-call response and update session | 1h |
| P0-3 | Route protection for gated pages | Add redirect if module not enabled | 1h |
| P0-4 | Webhook secret exposed in SELECT | Add security definer function or exclude from SELECT | 1h |
| P0-5 | Booking/dispatch handoff not auto-triggered | Add trigger or frontend call on create | 2h |

### P1 (High Priority - Should Fix Before Launch)

| ID | Issue | Fix | Effort |
|----|-------|-----|--------|
| P1-1 | Print ticket auto-trigger missing | Add useEffect for auto=true | 30m |
| P1-2 | Handoff retry buttons not wired | Connect retry to edge function call | 2h |
| P1-3 | HIPAA settings UI missing | Add Medical settings tab with toggles | 2h |
| P1-4 | Onboarding too complex | Simplify to 2-step flow | 4h |
| P1-5 | Business Brain page missing | Create unified AI knowledge center | 8h |
| P1-6 | Mobile Settings tab overflow | Add accordion/dropdown for mobile | 2h |

### P2 (Medium Priority - Post-Launch Improvements)

| ID | Issue | Fix | Effort |
|----|-------|-----|--------|
| P2-1 | Dashboard not mode-specific | Create DashboardByMode component | 4h |
| P2-2 | Knowledge gaps UI missing | Build knowledge_gaps review page | 4h |
| P2-3 | Password leak protection disabled | Enable in Supabase Auth settings | 15m |
| P2-4 | Website/PDF import for AI knowledge | Implement scraper/parser | 8h |
| P2-5 | Mobile table → card view | Create responsive table component | 4h |

---

## PART D: MODE-BY-MODE END-TO-END TEST PLAN

### Service Mode Test

1. Create new account
2. Select "Auto Detailing" industry
3. Complete minimal onboarding (name, phone)
4. Select "Voice" plan
5. Verify: Bookings tab visible, Orders hidden
6. Add a service with price
7. Test AI call (browser test)
8. Verify call appears in Calls page
9. Manually create a booking
10. Verify booking appears in calendar

### Dispatch Mode Test

1. Switch to Dispatch mode via AdminModeSwitcher
2. Verify: Dispatch tab visible, Bookings hidden
3. Create a dispatch job
4. Update job status through workflow
5. Test AI call with "I need a tow"
6. Verify urgent job priority handling
7. Check dispatch handoff settings

### Food Mode Test

1. Switch to Food mode via AdminModeSwitcher
2. Verify: Orders, Menu, Reservations, Catering tabs visible
3. Add menu items
4. Create a reservation
5. Create a food order manually
6. Test print ticket (80mm format)
7. Test order handoff webhook
8. Verify special instructions prominent on ticket

### Medical Mode Test

1. Switch to Medical mode via AdminModeSwitcher
2. Verify: Medical Intake tab visible, hipaa_mode = true
3. Create a medical intake
4. Verify caller_phone redacted in call session context
5. Check HIPAA badge on dashboard

### General Mode Test

1. Switch to General mode via AdminModeSwitcher
2. Verify: Only basic tabs visible (Dashboard, Inbox, Calls, Leads, Services)
3. Test AI call - should handle general inquiries
4. Verify no industry-specific features shown

---

## PART E: PROPOSED INFORMATION ARCHITECTURE

### Navigation by Mode

**All Modes (Common):**
- Dashboard
- Inbox
- Calls
- Leads
- Services
- Automations
- AI Assistant
- Simulator
- Settings

**Service Mode Additions:**
- Bookings

**Dispatch Mode Additions:**
- Dispatch

**Food Mode Additions:**
- Orders
- Menu Center
- Reservations
- Catering

**Medical Mode Additions:**
- Bookings
- Medical Intake

### Settings Tabs by Mode

**All Modes:**
- Business
- Hours
- Team
- Billing
- Notifications
- Developer

**Food Mode Addition:**
- Food (Order Delivery)

**Booking-Enabled Addition:**
- Booking Delivery

**Dispatch-Enabled Addition:**
- Dispatch Delivery

**Medical Mode Addition:**
- HIPAA Settings (new)

---

## PART F: SCHEMA CHANGES REQUIRED

### New Tables

1. **hipaa_settings** (for medical tenants)
```sql
CREATE TABLE hipaa_settings (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id),
  store_transcripts boolean DEFAULT false,
  store_recordings boolean DEFAULT false,
  phi_retention_days integer DEFAULT 30,
  audit_access_logs boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Column Additions

None required - existing schema is comprehensive.

### Index Additions

1. Add index on `ai_call_sessions.twilio_call_sid` for faster lookup:
```sql
CREATE INDEX IF NOT EXISTS idx_ai_call_sessions_twilio_call_sid 
ON ai_call_sessions(twilio_call_sid);
```

---

## Implementation Priority Order

1. **Week 1 - Security & Stability (P0)**
   - Gate AdminModeSwitcher
   - Fix conversation_id linkage
   - Add route protection
   - Fix webhook secret exposure
   - Wire handoff triggers

2. **Week 2 - Core UX (P1)**
   - Simplify onboarding flow
   - Build Business Brain page
   - Add HIPAA settings UI
   - Fix mobile Settings overflow

3. **Week 3 - Polish (P2)**
   - Mode-specific dashboards
   - Knowledge gaps UI
   - Mobile responsiveness improvements


import { useState } from "react";
import { ChevronDown, ChevronRight, Printer } from "lucide-react";

function Section({ number, title, children, defaultOpen = false }: { number: number; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6 break-inside-avoid">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left text-lg font-bold py-2 border-b-2 border-gray-300 print:border-gray-500 hover:bg-gray-50 print:hover:bg-transparent"
      >
        {open ? <ChevronDown className="h-5 w-5 print:hidden" /> : <ChevronRight className="h-5 w-5 print:hidden" />}
        <span>{number}. {title}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Flow({ children }: { children: string }) {
  return (
    <pre className="bg-gray-50 print:bg-transparent border border-gray-200 print:border-gray-400 rounded p-4 overflow-x-auto text-xs leading-relaxed font-mono whitespace-pre">
      {children}
    </pre>
  );
}

export default function SystemMapPage() {
  const [allOpen, setAllOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 print:text-black">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 py-8 print:py-4">
        <div className="flex items-center justify-between mb-2 print:mb-1">
          <h1 className="text-2xl font-bold tracking-tight">CloseLoop — System Map</h1>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => setAllOpen(!allOpen)}
              className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
            >
              {allOpen ? "Collapse All" : "Expand All"}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 print:text-gray-700 mb-8">
          Complete application flowchart. Use Ctrl+P (Cmd+P) to save as PDF. Generated {new Date().toLocaleDateString()}.
        </p>

        {/* ─── Sections ─── */}

        <Section number={1} title="Top Level — Homepage to Auth Routing" defaultOpen={allOpen} key={`1-${allOpen}`}>
          <Flow>{`                         +------------------+
                         |    HOMEPAGE (/)   |
                         +------------------+
                                 |
            +--------------------+--------------------+
            |                    |                    |
     [Learn / Browse]     [Login (/login)]    [Sign Up (/signup)]
            |                    |                    |
   +--------+--------+          |                    |
   |        |        |          |                    |
Pricing  Agencies  Demos        |                    |
(/pricing) (/agencies)          |                    |
            |                   |                    |
   Agency Application           |                    |
   Form (bottom of page)        |                    |
            |                   |                    |
   [Submitted to Admin          +--------+-----------+
    for approval]                        |
                                  +------+------+
                                  |  Auth Check |
                                  +------+------+
                                         |
                    +--------------------+--------------------+
                    |                    |                    |
             super_admin?          has tenant?          no tenant?
                    |                    |                    |
              ADMIN FLOW           APP FLOW           ONBOARDING
                    |                    |              (/app/onboarding)
                    |               +----+----+
                    |               |         |
                    |          has sub?    no sub?
                    |               |         |
                    |           DASHBOARD   GO-LIVE
                    |                      (/app/go-live)
                    |                         |
                    |                    Pick Plan → Pay (Stripe)
                    |                         |
                    |                      DASHBOARD
                    |
              (also gets full App
               access via tenant switcher)`}</Flow>
        </Section>

        <Section number={2} title="Public Pages (No Login Required)" defaultOpen={allOpen} key={`2-${allOpen}`}>
          <Flow>{`PUBLIC
  |
  +-- / (Landing Page)
  |     Hero, Trust Signals, Demo Player, How It Works, Pricing, CTA
  |
  +-- /pricing (Pricing Page)
  |     Plan comparison, CTA to sign up
  |
  +-- /agencies (Agency Partner Page)
  |     Value props, How it works, Earnings calculator
  |     Agency Application Form → Saved to DB → Admin reviews
  |
  +-- /login (Login Page)
  |     Email + password → Auth check → Route to proper flow
  |
  +-- /signup (Sign Up Page)
  |     Email + password → Email verification → Login
  |
  +-- /estimate/:id (Public Estimate View)
  |     Customer views estimate sent by business (no login)
  |
  +-- /portal/:tenantId (Customer Portal)
  |     Customer self-service portal for a specific business (no login)
  |
  +-- /roi/:tenantId/:shareToken (Public ROI Report)
        Shareable ROI report link (no login)`}</Flow>
        </Section>

        <Section number={3} title="Business Owner Flow" defaultOpen={allOpen} key={`3-${allOpen}`}>
          <h3 className="font-semibold mb-2 text-sm uppercase tracking-wider text-gray-500">3a. Onboarding</h3>
          <Flow>{`SIGN UP → EMAIL VERIFY → LOGIN
  |
  +-- No tenant yet?
        |
        +-- ONBOARDING (/app/onboarding) — 5 phases:
              |
              Phase 0: Website Quick Start (paste URL to auto-import)
                |-- OR skip
              Phase 1: Identity
                |-- Business name, Industry selection (100+ options)
                |-- Business mode auto-set (service/dispatch/food/medical/sales/general)
                |-- Work style (solo/team)
              Phase 2: Offerings
                |-- Services/menu items (pre-filled from industry templates)
                |-- Operating hours
                |-- Service area (if mobile/dispatch)
              Phase 3: AI Personality
                |-- Tone selection
                |-- Booking mode (auto-book / qualify only / callback)
                |-- After-hours behavior, Custom greeting
              Phase 4: Connect
                |-- Notification phone number
                |-- Calendar connection (optional, can skip)
              Phase 5: Review + Go Live
                |-- Summary of all settings
                |-- Submit → Creates tenant, services, settings
                |
                +-- ONBOARDING COMPLETE → GO-LIVE PAGE (/app/go-live)
                      |
                      Step 1: Pick tier (Starter/Growth/Scale)
                      Step 2: Pick usage level within tier
                      AI Readiness checklist (P0 blockers shown)
                      Calendar connection prompt
                      |
                      +-- Pay via Stripe → subscription.status = 'active'
                            |
                            +-- DASHBOARD (active)`}</Flow>

          <h3 className="font-semibold mb-2 mt-6 text-sm uppercase tracking-wider text-gray-500">3b. Dashboard</h3>
          <Flow>{`DASHBOARD (/app/dashboard)
  |
  +-- If setup incomplete: SETUP WIZARD
  +-- If setup complete: LIVE DASHBOARD
        |
        +-- Agent Control Panel (on/off, status)
        +-- Alert Banners (profile incomplete, needs attention)
        +-- Metrics Grid (calls, bookings, revenue)
        +-- Mode-Specific Content:
        |     +-- Service mode: Upcoming bookings, quick book
        |     +-- Dispatch mode: Active jobs, queue
        |     +-- Food mode: Active orders, new order
        |     +-- Medical mode: Today's patients, intake
        |     +-- Sales mode: Pipeline, deals
        |     +-- General mode: Recent activity
        |     +-- Callback-only mode: Callback queue
        +-- Live Activity Feed (right sidebar)`}</Flow>

          <h3 className="font-semibold mb-2 mt-6 text-sm uppercase tracking-wider text-gray-500">3c. Sidebar Navigation</h3>
          <Flow>{`MAIN
  +-- Dashboard (/app/dashboard)
  +-- Leads/Inbox (/app/inbox)
  |     +-- Calls tab (all AI call sessions)
  |     +-- Leads tab (lead records)
  +-- Customers (/app/customers)

WORKSPACE (module-gated, only shows if enabled)
  +-- Bookings (/app/bookings) .............. [booking]
  +-- Dispatch (/app/dispatch) .............. [dispatch_queue]
  +-- Impound Lot (/app/impound-lot) ........ [impound_lot]
  +-- Fleet (/app/fleet) .................... [fleet_management]
  +-- Orders (/app/orders) .................. [food_orders]
  +-- Reservations (/app/reservations) ...... [reservations]
  +-- Catering (/app/catering) .............. [catering]
  +-- Patients (/app/medical-intake) ........ [medical_intake]
  +-- Sales Pipeline (/app/sales-pipeline) .. [sales_leads]
  +-- Test Drives (/app/test-drives) ........ [test_drives]
  +-- Inventory (/app/sales-inventory) ...... [sales_inventory]
  +-- Estimates (/app/estimates) ............ [estimates/phone_quotes]
  +-- Active Jobs (/app/jobs) ............... [job_tracking]

AI CENTER
  +-- Business Brain (/app/business-brain)
  |     +-- Identity tab (business info, templates)
  |     +-- Operations tab (hours)
  |     +-- Calendar tab (calendar connections)
  |     +-- Offerings tab (services catalog, pricing)
  |     +-- Coverage tab (service area, ETAs)
  |     +-- Policies tab (business rules)
  |     +-- Knowledge tab (FAQs, objections, documents, review queue)
  |     +-- AI Setup tab (greeting, guidelines, intelligence)
  +-- Test Your AI (/app/simulator)
  +-- AI Insights (/app/partner)

MANAGE
  +-- Integrations (/app/integrations)
  +-- Reports (/app/reports/roi)
  +-- Agency (/app/agency) — only if user is an agency
  +-- Settings (/app/settings)
        +-- Team Members
        +-- Plan & Billing (upgrade, add locations)
        +-- Revenue Tracking
        +-- Data Controls (recordings, transcripts, HIPAA)
        +-- Alerts (email/SMS notification preferences)
        +-- Integrations (webhooks)
        +-- Automation Rules
        +-- Lead Recovery
        +-- SMS Messaging
        +-- Referral Network
        +-- Developer Tools (debug)
        +-- Danger Zone (delete account)

BOTTOM
  +-- Help (/app/help)`}</Flow>

          <h3 className="font-semibold mb-2 mt-6 text-sm uppercase tracking-wider text-gray-500">3d. Business Team Flow ★ Partially Built</h3>
          <Flow>{`Owner invites team member (Settings > Team)
  |
  +-- Team member receives invite
  +-- Signs up / logs in
  +-- Linked to same tenant via tenant_users table
  +-- Role determines permissions:
       +-- owner: full access
       +-- manager: most access
       +-- staff: limited access (view bookings, update status)
       +-- ★ Role-based UI gating: NOT YET IMPLEMENTED`}</Flow>
        </Section>

        <Section number={4} title="Agency Flow" defaultOpen={allOpen} key={`4-${allOpen}`}>
          <Flow>{`PUBLIC: /agencies page
  |
  +-- Agency Application Form
  |     Name, email, experience, website, plan
  |     |
  |     +-- Submitted → Stored in DB
  |     +-- Admin reviews at /admin/agency-applications
  |           |
  |           +-- Approved → agency_accounts row created
  |           +-- Rejected → notified

AGENCY LOGIN (same /login page, same auth)
  |
  +-- User has agency_accounts record?
        |
        YES → /app/agency (Agency Dashboard)
              |
              +-- Header: Agency name, "Add Client" button
              +-- KPI Cards (AgencyOverview):
              |     Active clients, total calls, revenue, commission
              |
              +-- Managed Clients list (AgencyTenantList):
              |     Each client shows: name, status, calls, revenue
              |     +-- "Switch Into Client" button
              |           |
              |           +-- Enters that client's full dashboard
              |           +-- "Back to Agency" nav element persists
              |
              +-- Lead Finder (AgencyLeadFinder):
              |     +-- Search tab:
              |     |     Industry + location search
              |     |     3 searches per day limit (counter shown)
              |     |     Results show: business name, score, temp badge
              |     |     "Save All" or save individual leads
              |     |     Already-saved leads show "Saved" badge
              |     +-- Saved Leads tab:
              |           All saved leads with status tracking
              |           Filter by: New, Contacted, Interested, Converted
              |           Click lead → detail panel with:
              |             Contact info, website, address
              |             CloseLoop score breakdown
              |             Friction signals, temperature
              |             Status dropdown + notes field
              |
              +-- Commission History (AgencyCommissionHistory)
              |
              +-- Quick Provision Wizard:
                    Add new client → Creates tenant
                    Links to agency via agency_tenants table

AGENCY TEAM ★ NOT YET BUILT
  |
  +-- Sub-accounts / team members for the agency
  +-- Agency owner invites sales reps
  +-- Each rep can search leads, provision clients, view commission
  +-- Agency owner sees all reps' activity + aggregate metrics`}</Flow>
        </Section>

        <Section number={5} title="Admin (Super-Admin) Flow" defaultOpen={allOpen} key={`5-${allOpen}`}>
          <Flow>{`LOGIN (same /login page)
  |
  +-- user_roles.role = 'super_admin'?
        |
        YES → Can access BOTH:
              |
              +-- ADMIN PANEL (/admin/*)
              |     |
              |     +-- Admin Top Bar:
              |     |     Mode Selector (Admin view / Client view)
              |     |     Tenant Switcher (switch into any tenant)
              |     |
              |     +-- /admin/overview .......... System-wide metrics, health
              |     +-- /admin/tenants ........... All tenants list, search, details
              |     +-- /admin/demo-library ...... Demo call recordings by industry
              |     +-- /admin/golden-path ....... QA test matrix for all modes
              |     +-- /admin/support ........... Support tickets / issues
              |     +-- /admin/agency-applications Review + approve/reject agencies
              |     +-- /admin/setup-requests .... Tenant setup assistance requests
              |     +-- /admin/audit-report ...... Security and compliance audit
              |     +-- /admin/test-onboarding ... Test onboarding (no real data)
              |
              +-- APP (/app/*) with admin superpowers:
              |     +-- Admin bar at top of every page
              |     +-- Tenant Switcher dropdown
              |     +-- Can view/edit any tenant's data
              |     +-- Subscription gating bypassed
              |     +-- All modules visible
              |
              +-- DEBUG TOOLS (/debug/*)
                    +-- /debug/telephony ....... Twilio call inspection
                    +-- /debug/ai-context ...... What AI sees during calls
                    +-- /debug/availability .... Slot computation debugger
                    +-- /debug/extraction ...... Payload parsing debugger
                    +-- /debug/context ......... Full context debugger`}</Flow>
        </Section>

        <Section number={6} title="Driver Portal Flow" defaultOpen={allOpen} key={`6-${allOpen}`}>
          <Flow>{`/driver-login (separate login page)
  |
  +-- Driver authenticates
  |
  +-- DRIVER LAYOUT (/driver/*)
        |
        +-- Header: Driver name/photo, active job count, sign out
        |
        +-- /driver (Dashboard)
        |     Active jobs list, accept/decline, status updates
        |
        +-- /driver/jobs/:id (Job Detail)
        |     Pickup/dropoff info, customer contact
        |     Status: assigned → en_route → on_scene → complete
        |     Photo upload, notes
        |
        +-- /driver/impound (Impound Log)
        |     Log vehicles into impound lot
        |     VIN, photos, condition notes
        |
        +-- /driver/vehicle (Vehicle Select)
              Select which truck/vehicle driver is using today
        |
        +-- Bottom nav: Jobs | Log Vehicle | My Truck`}</Flow>
        </Section>

        <Section number={7} title="Inbound Call Flow (AI Backend)" defaultOpen={allOpen} key={`7-${allOpen}`}>
          <Flow>{`PHONE CALL IN
  |
  +-- Twilio receives call on assigned number
  +-- twilio-inbound edge function
  |     Resolves tenant from phone number
  |     Builds business context (build-business-brain)
  +-- Registers call with ElevenLabs (register-call)
  |     Passes dynamic variables (business name, hours, etc.)
  +-- Returns TwiML to Twilio (connects caller to AI)
  |
  +-- AI CONVERSATION HAPPENS
  |     ElevenLabs AI speaks as receptionist
  |     Extracts: caller intent, name, phone, service needed, etc.
  |
  +-- CONVERSATION ENDS
  |     ElevenLabs sends webhook → elevenlabs-webhook
  |     |
  |     +-- Parse transcript + extracted data
  |     +-- Update ai_call_sessions record
  |     +-- Resolve/create customer (phone E.164 match)
  |     +-- Create opportunity record
  |     +-- Determine next_action based on intent:
  |           |
  |           +-- "book" ----→ booking-handoff
  |           |     Create booking, busy block, calendar event
  |           |     Send confirmation (SMS/email)
  |           |
  |           +-- "dispatch" → dispatch-handoff
  |           |     Create dispatch job, notify driver
  |           |
  |           +-- "order" --→ order-handoff
  |           |     Create food order + items
  |           |
  |           +-- "callback" → universal-delivery
  |           |     Send notification to business owner
  |           |
  |           +-- "intake" -→ medical intake record
  |           |
  |           +-- "message_only" → log + notify
  |
  +-- Trigger workflow automations (trigger-workflow)
        Execute configured automation rules
        Send follow-up messages, update CRM, etc.`}</Flow>
        </Section>

        <Section number={8} title="Subscription / Gating Flow" defaultOpen={allOpen} key={`8-${allOpen}`}>
          <Flow>{`User logs in
  |
  +-- Has active subscription (active or trialing)?
  |     |
  |     YES → Full app access, all enabled modules
  |     |
  |     NO → Redirected to /app/go-live
  |           (except /app/settings and /app/agency always accessible)
  |           |
  |           +-- Pick tier → Pick usage → Stripe checkout
  |           +-- On success → subscription.status = 'active'
  |           +-- Redirect to dashboard
  |
  +-- Is super_admin?
        |
        YES → Subscription gating bypassed entirely`}</Flow>
        </Section>

        <Section number={9} title="Not Yet Built ★" defaultOpen={allOpen} key={`9-${allOpen}`}>
          <div className="bg-yellow-50 print:bg-transparent border border-yellow-200 print:border-gray-400 rounded p-4 text-sm space-y-1.5">
            <p className="font-semibold text-yellow-800 print:text-black">The following features are planned but not yet implemented:</p>
            <ul className="list-disc pl-5 space-y-1 text-yellow-900 print:text-black">
              <li>Business team roles/permissions UI (owner/manager/staff gating)</li>
              <li>Agency sub-teams (reps with individual logins)</li>
              <li>Agency team lead assignment</li>
              <li>Customer self-service booking portal (portal page exists but limited)</li>
              <li>Driver assignment/dispatch from AI calls (partially built)</li>
              <li>Multi-location calendar per location</li>
              <li>SMS two-way conversations</li>
              <li>Password reset page (/reset-password)</li>
              <li>Team member invitation emails</li>
            </ul>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-200 text-xs text-gray-400 print:text-gray-600">
          CloseLoop System Map — Internal Reference — {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
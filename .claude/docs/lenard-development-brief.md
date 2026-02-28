# Lenard Development Brief: Flux Receptionist

## STRATEGIC DIRECTION (From Jack, Feb 25 2026)

Lenard owns the development and completion of Flux Receptionist. This is the #1 priority during non-business hours until every business mode is 1000% complete, user-friendly, and production-ready.

**Core Philosophy**: Every business owner who signs up must feel like the platform was built specifically for THEM. No confusion. No overwhelm. No skipped corners. Every scenario considered. One-of-a-kind quality.

**Approach**: Complete one business mode at a time to perfection, then start marketing that mode while finishing the rest. Start with Service mode (appointments) since it covers the widest range of businesses.

---

## THE #1 PROBLEM: BUSINESS BRAIN COMPLEXITY

Jack identified the biggest bottleneck: the Business Brain is confusing. 70+ configurable cards across 6 categories is overwhelming for a small business owner who just wants their phone answered.

### Current State
- 7-phase onboarding (~20 min) collects basics
- Business Brain has 70+ cards organized into 6 categories
- Industry templates auto-fill some defaults
- Guided setup triggers at <50% AI readiness
- Mode-specific UI hides irrelevant features
- 135 brain components total

### The Vision
The onboarding should be SO SMART that by the time a business owner lands on their dashboard, 80%+ of their configuration is already done perfectly. The Business Brain becomes a place to TWEAK, not to BUILD FROM SCRATCH.

---

## DEVELOPMENT PRIORITIES (By Business Mode)

### Phase 1: Service Mode (Appointments) - FIRST TO PERFECT

Target businesses: HVAC, plumbing, electrical, auto repair, hair salons, barbers, dentists, chiropractors, cleaning services, landscaping, pest control, etc.

#### 1.1 Smart Onboarding Overhaul
- [ ] Reduce cognitive load: combine phases where possible (aim for 5 phases max, 10 min total)
- [ ] Make industry selection the FIRST thing (before business name) so EVERYTHING adapts immediately
- [ ] After industry selection, pre-fill EVERYTHING: services, pricing ranges, hours, FAQs, policies, AI scripts, coverage area defaults
- [ ] Use conversational discovery: "Do customers usually call for emergencies or scheduled visits?" -> auto-configures urgency handling, after-hours behavior, and pricing model
- [ ] Website import should be MORE aggressive: scrape services, hours, reviews, FAQs, pricing, about text, and pre-fill ALL matching Brain fields
- [ ] Show a LIVE PREVIEW of how their AI will sound during onboarding (sample call script)
- [ ] End onboarding with: "Your AI is ready. Here's what it knows about your business:" (summary card)

#### 1.2 Business Brain Redesign
- [ ] Default view should be a SIMPLE dashboard, not the full Brain
- [ ] Show only 3-5 "most important" settings for their mode, with "Show more" for advanced
- [ ] Group settings by IMPORTANCE, not by category (P0: hours/services/area, P1: scripts/FAQs, P2: policies/advanced)
- [ ] Add inline help: "Why this matters" tooltips explaining how each setting affects calls
- [ ] Add "AI Preview" button on every section: "Here's how your AI will handle this based on current settings"
- [ ] Implement "Smart Defaults" badge: settings that are already optimized for their industry
- [ ] Add undo/version history for all Brain changes
- [ ] Mobile-first design: every editor must work perfectly on phone

#### 1.3 Dashboard Polish
- [ ] First-time dashboard experience: celebration + guided tour
- [ ] "Make a test call" as the PRIMARY action for new users
- [ ] Show AI readiness as a friendly progress bar, not a score
- [ ] Recent activity feed should show WHAT the AI did on each call (not just "call received")
- [ ] Quick actions: "Update hours", "Add a service", "Check my area"
- [ ] Notification center: "Your AI handled 3 calls today. 2 booked, 1 left a message."

#### 1.4 Call Flow Perfection
- [ ] Test EVERY edge case for service bookings:
  - Customer wants earliest available
  - Customer wants specific date/time
  - Customer wants a service not in the catalog
  - Customer asks about pricing (with ranges vs. fixed)
  - Customer wants to cancel/reschedule
  - Customer calls after hours
  - Customer in coverage area vs. outside
  - Emergency vs. scheduled
  - Customer pushback on pricing
  - Customer wants to speak to a human
  - Multiple services in one call
  - Calendar conflict handling
  - Walk-in vs. appointment confusion
- [ ] Ensure Google Calendar sync actually creates events with correct details
- [ ] Verify SMS confirmations send after booking
- [ ] Verify email notifications reach business owner
- [ ] Test voicemail and missed call handling

#### 1.5 End-to-End Testing
- [ ] Sign up as a fake plumbing company (full onboarding)
- [ ] Sign up as a fake hair salon (full onboarding)
- [ ] Sign up as a fake dental office (full onboarding)
- [ ] Make real phone calls to each, test every scenario above
- [ ] Verify dashboard shows correct data after calls
- [ ] Verify billing works (Stripe subscription + usage tracking)
- [ ] Test on mobile browser (iPhone Safari, Android Chrome)
- [ ] Test with slow internet connection
- [ ] Test error states: what happens when ElevenLabs is down? Twilio error? DB timeout?

### Phase 2: Dispatch Mode (On-Demand/Towing)
- Same level of detail as Phase 1 but for: towing, locksmith, delivery, moving, roadside assistance
- GPS/routing must work flawlessly
- Driver assignment and ETA must be accurate
- Coverage zone visualization with Mapbox
- Real-time job tracking for dispatchers
- Driver mobile app/portal experience

### Phase 3: Food Mode (Orders)
- Menu management must be DEAD SIMPLE
- Order flow: phone -> AI takes order -> kitchen display -> delivery/pickup
- Delivery zone management
- Special instructions handling
- Daily specials/temporary menu items
- Catering orders (larger, scheduled)
- Integration with common POS systems (future)

### Phase 4: Sales Mode (Leads)
- Lead qualification must feel natural, not interrogative
- Pipeline management (hot/warm/cold)
- Test drive scheduling (car dealers)
- Inventory search ("Do you have a red Honda Civic?")
- Follow-up automation
- CRM-like lead tracking

### Phase 5: Medical Mode (Intakes)
- HIPAA compliance must be bulletproof
- Patient intake forms
- Insurance verification
- Symptom triage (urgency routing)
- Appointment types (new patient vs. follow-up)
- Prescription refill requests

### Phase 6: General Mode (Callbacks)
- Simplest mode but must be polished
- FAQ handling
- Callback scheduling
- Lead capture
- Business info (hours, location, services)

---

## UX PRINCIPLES (Non-Negotiable)

1. **If the user has to think about it, we failed.** Every setting should have a sensible default. Every question should be phrased in plain English. Every action should have a clear outcome.

2. **Progressive disclosure.** Show the minimum needed. Advanced settings hidden by default. Business owners who want control can find it, but beginners never see it.

3. **Show, don't tell.** Instead of "Configure your AI greeting", show a preview: "Hi, thanks for calling Mike's Plumbing! How can I help you today?" with an edit button.

4. **Celebrate progress.** Every completed section = positive feedback. Every call handled = notification. Every booking = celebration.

5. **Industry-first, feature-second.** A plumber doesn't care about "AI personality configuration". They care about "How my phone gets answered when I'm under a sink."

6. **Mobile-first.** Business owners check their dashboard on their phone between jobs. Every single page must work perfectly on a 375px screen.

7. **Fail gracefully.** If something breaks, the user should never see a blank screen or cryptic error. Always show what happened and what to do next.

8. **Zero-config works.** A business owner should be able to complete onboarding with ONLY their business name and industry, and the AI should work reasonably well with just those defaults. Everything else is optimization.

---

## TECHNICAL APPROACH

### When Working on Receptionist
1. Always `cd C:\Users\jacka\receptionist` first
2. Read CLAUDE.md for project rules
3. NEVER run `npm run dev` - use `npm run build && npm run test` to verify
4. NEVER modify `src/integrations/supabase/types.ts`
5. Edge functions use Deno, not Node.js
6. All queries must include tenant_id (multi-tenant)
7. Test with `npm run build` after every change

### Code Quality Standards
- Zero TypeScript errors (currently clean)
- All 237 tests must pass after changes
- New features need new tests
- No `any` types in new code
- Proper error boundaries on new pages
- Accessible (ARIA labels, keyboard nav, screen reader support)
- Responsive (mobile-first, test at 375px, 768px, 1024px, 1440px)

### Key Files to Understand
| File | Purpose |
|------|---------|
| `src/pages/app/BusinessBrainPage.tsx` | Main Brain page (575 lines) |
| `src/components/brain/layout/businessBrainNavConfig.ts` | Master nav config (1,074 lines) |
| `src/pages/app/OnboardingPage.tsx` | Onboarding wizard (496 lines) |
| `src/components/brain/dashboard/BrainDashboard.tsx` | Brain dashboard hub (348 lines) |
| `src/config/industryOnboardingConfig.ts` | Industry presets (383 lines) |
| `src/data/industryTerminology.ts` | Mode-specific labels (374 lines) |
| `src/components/dashboard/LiveDashboard.tsx` | Main dashboard (63 lines) |

### Infrastructure (All Done)
- Supabase: 29 secrets configured, 155 edge functions, 199 migrations
- ElevenLabs: 7 agents, ConvAI webhooks configured
- Stripe: 4 plans, webhook active, price metadata correct
- Twilio: 8 phone numbers, all pointing to new Supabase
- Mapbox: Token set (g20fang account)
- Google Calendar: OAuth client created, Calendar API enabled, secrets set

---

## SCHEDULE

- **Non-business hours (6 PM - 7 AM ET)**: Primary receptionist development time
- **Business hours**: Marketing tasks, but receptionist bugs/fixes take priority
- **receptionist_dev session (DAILY 6 AM)**: Build, test, deploy
- **receptionist_marketing session (DAILY 5 PM)**: Content, outreach for completed modes

---

## SUCCESS CRITERIA

A business mode is "1000% complete" when:
1. A non-technical business owner can sign up, onboard, and have a working AI receptionist in under 10 minutes
2. The AI handles every realistic call scenario for that business type correctly
3. The dashboard shows useful, actionable data after calls
4. The Business Brain is simple to navigate and adjust
5. Billing works (signup -> trial -> payment -> active)
6. Mobile experience is flawless
7. Error states are handled gracefully
8. A real person has made 10+ test calls without finding bugs
9. The landing page for that mode clearly communicates value
10. Demo profiles exist for sales calls

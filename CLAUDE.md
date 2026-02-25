# Flux Receptionist - AI Voice Assistant SaaS Platform

## PROJECT OVERVIEW

AI-powered voice receptionist platform for local businesses. Handles phone calls 24/7, books appointments, dispatches drivers, takes food orders, manages medical intakes, and qualifies sales leads via natural conversation.

**Owner**: Jack Angelini / Flux Data Solutions
**Managed by**: Lenard (autonomous business operator)
**Repo**: https://github.com/glosslabsnj-hub/closeloop
**Local path**: C:\Users\jacka\receptionist
**Supabase project**: zsqfzluyylzmmjtfxwgr

## TECH STACK

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui
- **State**: TanStack React Query + React Context
- **Backend**: Supabase (Postgres, Auth, Edge Functions, Realtime, RLS)
- **Voice AI**: ElevenLabs Conversational AI + Twilio telephony
- **Payments**: Stripe subscriptions + usage-based billing
- **Maps**: Mapbox GL (dispatch mode)

## CRITICAL RULES

1. **NEVER run `npm run dev` from Claude Code sessions** - use build/test commands only.
2. **NEVER modify `src/integrations/supabase/types.ts`** directly - it's auto-generated. Create extension types in `src/types/` instead.
3. **Always run `npm run build && npm run test`** after changes to verify nothing breaks.
4. **Edge functions use Deno**, not Node.js. Import paths use `https://` URLs.
5. **Multi-tenant architecture** - ALL queries must include tenant_id filtering. NEVER bypass RLS.
6. **ElevenLabs agent changes** require running deployment scripts in `scripts/`. Don't modify agents via API without using the standard template in `ELEVENLABS_AGENT_STANDARD_TEMPLATE.js`.
7. **Brand config is centralized** in `src/config/brand.ts`. Update there, not in individual components.
8. **Database path**: Supabase cloud (zsqfzluyylzmmjtfxwgr.supabase.co)

## PROJECT STRUCTURE

```
src/
  components/     # UI organized by domain (brain/, dashboard/, dispatch/, etc.)
  hooks/          # 117 React Query hooks
  pages/          # Route pages (app/, admin/, debug/, public/, driver/)
  config/         # Pricing, brand, industry configs
  contexts/       # AuthContext, TenantContext
  types/          # TypeScript type definitions
  lib/            # Utilities (quoteEngine, brain, eta, logging)
  data/           # Static data (industry catalog, templates)
  integrations/   # Supabase client + auto-generated types
supabase/
  functions/      # 156 Edge Functions (Deno)
  migrations/     # 170+ database migrations
  sql/            # SQL utilities
scripts/          # ElevenLabs agent deployment scripts
tests/            # Vitest unit tests (237 passing)
e2e/              # Playwright E2E tests
docs/             # Architecture docs, agent audits, deployment guides
.claude/rules/    # 17 architecture rule files for Claude Code
```

## BUSINESS MODES

The platform supports 6 business modes, each with specialized features:

| Mode | Entity Created | ElevenLabs Agent | Key Features |
|------|---------------|-----------------|--------------|
| Service | Bookings | service-agent | Appointment scheduling, calendar sync |
| Dispatch | Dispatch Jobs | dispatch-agent | GPS routing, driver assignment, ETA |
| Food | Food Orders | food-agent | Menu ordering, delivery zones, kitchen display |
| Medical | Medical Intakes | medical-agent | HIPAA mode, intake forms, urgency triage |
| Sales | Sales Leads | sales-agent | Pipeline management, test drives, inventory |
| General | Callbacks | general-agent | Lead capture, FAQ, callback scheduling |

## VOICE CALL FLOW

```
Phone Call → Twilio → twilio-inbound (resolve tenant from phone#)
  → ElevenLabs Agent (mode-specific, with business context)
  → elevenlabs-webhook (extract payload, create entity)
  → booking-handoff / dispatch-handoff / etc.
  → Automation rules → Notifications
```

## CURRENT STATUS

- **Build**: Clean (0 TypeScript errors, 0 ESLint errors)
- **Tests**: 237 passing (8 test files)
- **ESLint warnings**: ~1,752 (mostly `any` types from stale Supabase type generation)
- **Brand**: Fully rebranded to "Flux Receptionist" (brand.ts, all UI components, all 28 edge functions updated)

## BUSINESS MODE READINESS (update each session)

| Mode | Status | What's Needed |
|------|--------|---------------|
| Service (appointments) | NOT STARTED | Supabase migration, test booking flow end-to-end |
| Dispatch (drivers/GPS) | NOT STARTED | Supabase migration, test dispatch + driver assignment |
| Food (orders) | NOT STARTED | Supabase migration, test menu ordering flow |
| Medical (intakes) | NOT STARTED | Supabase migration, test intake + triage flow |
| Sales (leads) | NOT STARTED | Supabase migration, test lead qualification flow |
| General (callbacks) | NOT STARTED | Supabase migration, test callback scheduling |

**Strategy**: Get core platform working first (Supabase migration, auth, billing). Then make ONE mode production-ready, hand off to marketing, and move to the next.

## PRIORITY WORK QUEUE

### P0 - Production Blockers
- [ ] **MIGRATE SUPABASE (CRITICAL)**: Current Supabase project (zsqfzluyylzmmjtfxwgr) is hosted through Lovable and Jack has no direct access. Must create a NEW Supabase project under Jack's own account, run all 170+ migrations from supabase/migrations/, deploy all 156 edge functions, update .env with new project URL/keys, and test everything. Lovable login: glosslabsnj@gmail.com. ONLY cancel Lovable subscription AFTER migration is verified working.
- [ ] Verify Stripe products/prices match pricing.ts configuration
- [ ] Verify ElevenLabs agents are configured and responding
- [ ] Verify Twilio phone number routing works end-to-end
- [ ] Test complete signup → onboarding → first call flow

### P1 - Launch Readiness
- [ ] Regenerate Supabase types (need access token) to eliminate `as any` casts
- [x] ~~Complete branding update across all UI components and edge functions~~ (done 2026-02-25)
- [ ] Set up production domain and SSL
- [ ] Configure Stripe webhook endpoints
- [ ] Set up email delivery (transactional emails for estimates, booking confirmations)

### P2 - Quality Improvements
- [ ] Reduce ESLint warnings (1,752 → 0) by adding proper TypeScript types
- [ ] Code-split BusinessBrainPage (871 kB) and AIAssistantPage (546 kB)
- [ ] Add route-level auth guards (currently component-level only)
- [ ] Add error boundaries to major page sections
- [ ] Improve onboarding flow (7 phases may be too many)

### P3 - Growth Features
- [ ] Landing page optimization for conversions
- [ ] Agency/reseller program launch
- [ ] Demo profiles for sales calls
- [ ] Customer testimonials and case studies
- [ ] SEO optimization

## TESTING

```bash
npm run test          # Run all unit tests
npm run build         # Production build
npx eslint .          # Lint check
npx tsc --noEmit      # Type check (if TypeScript installed)
```

## LENARD INTEGRATION

This project is managed by Lenard alongside the main Flux Data consulting business:
- **Marketing**: Lenard promotes this product through LinkedIn, X, Upwork, and direct outreach
- **CRM**: Receptionist leads tracked in Lenard's CRM as product: "flux-receptionist"
- **Content**: Lenard creates content showcasing the platform's capabilities
- **Support**: Lenard monitors the Supabase dashboard for issues

The Lenard project lives at C:\Users\jacka\lenard (completely separate codebase).

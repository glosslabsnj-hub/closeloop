# Flux Receptionist - AI Voice Assistant SaaS Platform

## PROJECT OVERVIEW

AI-powered voice receptionist platform for local businesses. Handles phone calls 24/7, books appointments, dispatches drivers, takes food orders, manages medical intakes, and qualifies sales leads via natural conversation.

**Owner**: Jack Angelini / Flux Data Solutions
**Managed by**: Lenard (autonomous business operator)
**Repo**: https://github.com/glosslabsnj-hub/closeloop
**Local path**: C:\Users\jacka\receptionist
**Supabase project (NEW)**: yltzlvzgwkidbeqaoevp (Jack's own account)
**Supabase project (OLD)**: zsqfzluyylzmmjtfxwgr (Lovable-hosted, being replaced)

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
8. **Database path**: Supabase cloud (yltzlvzgwkidbeqaoevp.supabase.co)

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
| Service (appointments) | INFRA READY | Test booking flow end-to-end with real call |
| Dispatch (drivers/GPS) | INFRA READY | Mapbox token needed, test dispatch + driver assignment |
| Food (orders) | INFRA READY | Test menu ordering flow with real call |
| Medical (intakes) | INFRA READY | Test intake + triage flow with real call |
| Sales (leads) | INFRA READY | Test lead qualification flow with real call |
| General (callbacks) | INFRA READY | Test callback scheduling with real call |

**Strategy**: Core platform infrastructure is done (Supabase, auth, billing, voice AI). Focus ONE mode (Service) to production-ready, do a real end-to-end call test, then hand off to marketing.

## ELEVENLABS AGENT IDS

| Mode | Agent Name | Agent ID |
|------|-----------|----------|
| Service | SERVICE & BOOKING | agent_4701kg1vwhzqfxmvzh032nhvx434 |
| Dispatch | DISPATCH | agent_2601kghfpmckez3t2n6p7bmcpac4 |
| Food | FOOD & RESTURANT | agent_6501kghfd7pcf5dte8k61wnn0m58 |
| Medical | medical | agent_1001kghfstqzfryadtx3kh9t4ye4 |
| Sales | Sales | agent_2301kh5ertzwfas9e9badpers2cf |
| General | GENERAL | agent_9601kghg3djcfbfvwxxfkrxqpmq9 |
| Impound | INPOUND | agent_6301kgqscdvyek3a6wgegq8et167 |

## PRIORITY WORK QUEUE

### P0 - CRITICAL: Onboarding Intelligence Overhaul
**READ `.claude/docs/product-quality-mandate.md` BEFORE ANY WORK. Jack's direct feedback.**

- [x] ~~**FIX RLS POLICIES**: user_roles and tenant_users missing SELECT policies. Super admin couldn't log in, onboarding couldn't create tenants.~~ (done 2026-02-28, migration: 20260228080000_fix_missing_rls_policies.sql)
- [x] ~~**ONBOARDING INTELLIGENCE**: Industry intelligence layer shipped (2026-02-28). `isWorkStyleDeterministic()` skips obvious questions. `suppressedFor` hides irrelevant scenario questions. Work style auto-detected for home_services/beauty/medical/food/sales_dealerships. ModeAwareQuestions wired to Phase 1. walk-ins defaultValue fixed (was `true`, now `false`).~~
- [ ] **INDUSTRY TERMINOLOGY**: Audit onboarding for industry-native words. Plumber: "jobs" not "appointments". Restaurant: "orders" not "bookings". Use `industryTerminology.ts` labels in Phase 3 and Phase 4 headers.
- [ ] **REMOVE REDUNDANT QUESTIONS**: Verify no question appears twice across phases. Team size check: staff-scheduling scenario question is only occurrence (businessDetailsForm.teamSize not rendered).
- [ ] **MAP QUESTIONS TO FEATURES**: Audit which scenario questions actually change AI behavior. Remove any that are purely cosmetic.
- [ ] **INDUSTRY-SPECIFIC ONBOARDING**: Each industry should feel custom-built. Different questions, terminology, defaults, and examples per industry.
- [ ] **VERIFY TENANT CREATION**: Test both quick and full onboarding paths end-to-end after RLS fixes.
- [ ] **VERIFY SUPER ADMIN FLOW**: Login -> admin dashboard (not onboarding). Create test tenants. Switch between tenants and modes.

### P0.5 - Previous Production Blockers (All Infrastructure Done)
- [x] ~~All Supabase secrets, migrations, edge functions, Twilio, ElevenLabs, Stripe, Mapbox, Google Calendar~~ (done 2026-02-25)
- [x] ~~Fix Quick Book button broken route~~ (done 2026-02-27)

### P1 - Launch Readiness
- [ ] Test complete signup -> onboarding -> first call flow (end-to-end)
- [ ] Set up production domain and SSL (app.getfluxdata.com deployed, SSL active)

### P2 - Quality Improvements
- [ ] Code-split BusinessBrainPage (871 kB) and AIAssistantPage (546 kB)
- [ ] Add error boundaries to major page sections
- [ ] Business Brain simplification (3-5 settings default, advanced hidden)
- [ ] Dashboard polish (test call button, zero-state, mobile-first)

### P3 - Growth Features
- [ ] Landing page optimization for conversions
- [ ] Agency/reseller program launch
- [ ] Demo profiles for sales calls

## SECRETS STATUS (Supabase project yltzlvzgwkidbeqaoevp)

**29 secrets configured (all critical + calendar ones set):**
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_PHONE_NUMBER, RESEND_API_KEY, PERPLEXITY_API_KEY, FIRECRAWL_API_KEY, ANTHROPIC_API_KEY, APP_URL, OPS_ALERT_EMAIL, CLOSELOOP_INTERNAL_SECRET, CLOSELOOP_OAUTH_STATE_SECRET, ADMIN_CLEANUP_SECRET, PORTAL_TOKEN_SECRET, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, ELEVENLABS_AGENT_ID_IMPOUND, ELEVENLABS_CONVAI_WEBHOOK_SECRET, MAPBOX_ACCESS_TOKEN, GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI, plus 4 auto-provided Supabase keys (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL).

**Optional (not blocking production):**

| Secret | Source | Priority |
|--------|--------|----------|
| HERE_API_KEY | HERE developer portal | LOW (alternative geocoding) |
| GOOGLE_DISTANCE_MATRIX_API_KEY | Google Cloud Console | LOW (alternative routing) |
| MS_CALENDAR_CLIENT_ID | Azure portal | LOW (Outlook calendar) |
| MS_CALENDAR_CLIENT_SECRET | Azure portal | LOW (Outlook calendar) |
| MS_CALENDAR_REDIRECT_URI | Set to new project URL | LOW (Outlook calendar) |
| PDFSHIFT_API_KEY | PDFShift dashboard | LOW (PDF estimates) |

## TWILIO PHONE NUMBERS (all pointing to new Supabase)

| Phone | Friendly Name | SID |
|-------|--------------|-----|
| +16095071271 | CloseLoop - fa871fdd | PN82e3bf81024a3bb61b50f60abf687d69 |
| +15632786674 | CloseLoop - 976a2f3e | PN55548a9f8d62be396a185af834838c93 |
| +18553297357 | CloseLoop - aa96d3c3 | PNa0af00def24562ad1a1b809b6530c20b |
| +19204813421 | CloseLoop - 6b682be5 | PNe81c3ffeaed2fdd97ac966717180aa77 |
| +15054057226 | CloseLoop - 3d90cd98 | PN862b37582086f2aeef611edd8fbe6b8e |
| +13527806507 | CloseLoop - 91857144 | PN5fca687a2defcab6860dab582f6cce86 |
| +17348492892 | CloseLoop - 3b567b02 | PN8102142562df3ff8470aa07fc418686d |
| +14583093057 | CloseLoop - ebfb645b | PN2b166c1bab8e20acadf6c094dca8a930 |

All voice webhook URLs: `https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1/twilio-inbound`

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

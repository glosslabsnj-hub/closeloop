# CloseLoop Operating Rules + Memory

This document defines the operating rules and accumulated architectural knowledge for all development work on the CloseLoop platform. The MEMORY section grows over time as patterns, gotchas, and preferences are discovered.

## CLOSELOOP NORTH STAR

**"Every lead gets answered. Every opportunity gets pushed to booking."**

## GOLDEN PATH (must not break)

Twilio inbound → twilio-inbound → buildBusinessContext → ElevenLabs register-call → conversation → elevenlabs-webhook → CanonicalPayload → deterministic routing (intent × enabled_modules) → handoff functions → automation runs → handoff attempts logged.

## NON-NEGOTIABLES

- **No hardcoded demo data in product paths.** All app pages read/write real DB data.
- **customers is the single source of truth for identity.** Unique constraint is (tenant_id, phone_e164). Always normalize to E.164.
- **Behavior is driven ONLY by business_mode + enabled_modules** (industry is only for defaults/templates).
- **Twilio inbound must always return HTTP 200 + valid TwiML, even on errors.**
- **Never pass nulls to ElevenLabs dynamic variables** (use empty strings). Never speak placeholders like "None."
- **HIPAA rules apply ONLY to medical tenants.** Must not affect other tenants.
- **Knowledge uploads require approval;** "structured truth wins" until owner resolves.

## DATA + INTELLIGENCE PRINCIPLES (for "one of a kind AI")

- **AI must store data only in the correct canonical tables** (sessions → extracted payload → derived entities).
- **Use deterministic routing;** never create entities for modules that are disabled.
- **Prefer structured storage** (canonical payload, extracted fields, intent rules) over raw text.
- **Capture "knowledge gaps"** when the AI is asked something it cannot answer confidently.

## TECH STACK

- **Frontend**: React 18 + TypeScript + Vite + SWC
- **UI**: Radix UI primitives + shadcn/ui + Tailwind CSS + Framer Motion
- **State/Data**: TanStack React Query + Supabase JS client
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Backend**: Supabase Edge Functions (Deno runtime, TypeScript)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Voice AI**: ElevenLabs conversational AI
- **Telephony**: Twilio (voice + SMS)
- **Testing**: Vitest + Testing Library + jsdom
- **Linting**: ESLint 9 flat config

## CODING CONVENTIONS

- **Components**: PascalCase files, one component per file, co-locate with domain
- **Hooks**: `use` prefix, camelCase (e.g., `useBookings.ts`)
- **Types**: Defined in `src/types/` or co-located. Use Zod for runtime validation at boundaries.
- **Edge Functions**: Each in its own directory under `supabase/functions/<name>/index.ts`
- **Imports**: Use path aliases (`@/components/...`) configured in tsconfig
- **Styling**: Tailwind utility classes, use `cn()` helper from `src/lib/utils` for conditional classes
- **State**: Server state via TanStack Query, local state via React hooks/contexts
- **Error handling**: Toast notifications via Sonner for user-facing errors

## KEY SUPABASE EDGE FUNCTION PATTERNS

When working with edge functions:
- Shared code lives in `supabase/functions/_shared/`
- Use `Deno.env.get()` for environment variables
- Always include CORS headers in responses
- For webhook handlers: validate the incoming payload before processing
- For Twilio: return `text/xml` content type with TwiML
- For ElevenLabs: return JSON, never include null values in dynamic variables

## TESTING PATTERNS

- Run tests: `npm run test` or `npx vitest run`
- Watch mode: `npm run test:watch`
- Test files: `tests/*.test.ts` or co-located `*.test.ts`
- Mock Supabase: Create mock client for DB-dependent tests
- Focus on: deterministic routing logic, module gating, canonical payload extraction

---

# MEMORY — Accumulated Architectural Knowledge

> This section is the permanent memory. It grows organically as the codebase evolves. When you learn something new about CloseLoop, add it here.

## GOLDEN PATH — File-by-File Trace

### Step 1: Twilio Inbound (Entry Point)
**File:** `supabase/functions/twilio-inbound/index.ts`
- Parses Twilio form data (From, To, CallSid, Digits for IVR)
- Normalizes caller phone to E.164
- Looks up tenant via `phone_numbers` table by `to_number`
- Fetches tenant config + `assistant_settings` (voice_ai_enabled, dispatch_ivr_mode)
- IVR handling: hybrid capability → press 1=booking/2=dispatch; dispatch IVR → press 1=towing/2=impound
- Calls `buildBusinessContext()` → `buildDynamicVariablesFromRegistry()`
- POSTs to ElevenLabs `/v1/convai/twilio/register-call` with 300+ dynamic variables
- Extracts `conversation_id` from TwiML stream URL via regex
- Creates `ai_call_sessions` record with conversation_id + twilio_call_sid
- Returns TwiML XML to Twilio
- **Error handling:** ALL errors return HTTP 200 + hangup TwiML (non-negotiable)
- **Logging:** `logTwilioEvent()` to `twilio_event_logs`

### Step 2: ElevenLabs Conversation
- External ElevenLabs agent processes the call using dynamic_variables as context
- No CloseLoop code involved during conversation itself
- Agent uses tools defined in `agentToolsConfig.ts` for real-time actions (check availability, create booking, etc.)

### Step 3: ElevenLabs Webhook (Call Completion)
**File:** `supabase/functions/elevenlabs-webhook/index.ts`
1. **Signature verification** — HMAC-SHA256 with `ELEVENLABS_CONVAI_WEBHOOK_SECRET`, 5-min freshness window
2. **Session lookup** — by `elevenlabs_conversation_id`, fallback by tenant_id + caller_phone
3. **Idempotency** — if `ended_at` already set, skip duplicate processing
4. **Extract raw data** — from `analysis.data_collection` + server-side transcript extraction
5. **Build CanonicalPayload** — structured extraction with intent, customer, booking/order/dispatch/callback fields
6. **Classify intent** — scoring system: data_collection fields + transcript keywords + extracted data presence
7. **Normalize** — parse natural language dates/times to ISO, validate no nulls
8. **Customer resolution** — lookup by phone, create if new, source = "ai_call"
9. **Session update** — transcript, summary, outcome, extracted_payload, customer_id, ended_at
10. **Usage tracking** — POST to `track-usage` with voice_minutes
11. **Slot lock release** — if not booked, release calendar reservations
12. **Event triggers** — `record-audit-event`, `trigger-workflow` for "call.ended"
13. **Intelligence** — POST to `process-call-outcome` for pattern detection
14. **Observations** — record customer preferences, time patterns if memory_enabled

### Step 4: Deterministic Routing
**File:** `supabase/functions/elevenlabs-webhook/index.ts` — `determineRoutingTarget()`
- **order** → `food_orders` if `food_orders` module enabled
- **reservation** → `reservations` if enabled, fallback to `bookings`
- **booking** → `bookings` if `booking` module enabled
- **dispatch** → `dispatch_jobs` if `dispatch_queue` module enabled
- **callback/faq/other** → no entity created (leads/opportunities only)
- **RULE:** Never create entities for disabled modules

### Step 5: Handoff Functions
**Files:** `booking-handoff/index.ts`, `dispatch-handoff/index.ts`, `order-handoff/index.ts`
- Each follows same pattern: fetch entity → check handoff enabled → build payload → execute methods (webhook/email/SMS) → log attempts
- **booking-handoff:** HMAC-signed webhook + SMS via Twilio + audit event + observations
- **dispatch-handoff:** Same + urgent SMS if priority=high/urgent + confirmation_summary
- **order-handoff:** Same + PrintNode receipt printing option
- All log to `handoff_attempts` table with status (success/failed) + error_message

### Step 6: Automation Runs
- `trigger-workflow` function routes to automation engine
- Workflows use canonical payload + session context
- Automation rules table: trigger_event → destination_provider → action_type → field_mapping

### Step 7: Handoff Attempts Logged
- Table: `handoff_attempts` — entity_type, entity_id, method, status, error_message, response_code
- Queried by `check-handoff-failures` cron for retry/alerting

## KEY FILE INDEX

### Golden Path Files (Touch With Extreme Care)
| File | Purpose |
|------|---------|
| `supabase/functions/twilio-inbound/index.ts` | Call intake entry, builds context, registers with ElevenLabs |
| `supabase/functions/elevenlabs-webhook/index.ts` | Call completion, canonical payload, routing, entity creation |
| `supabase/functions/booking-handoff/index.ts` | Booking delivery (webhook/email/SMS) |
| `supabase/functions/dispatch-handoff/index.ts` | Dispatch delivery (webhook/email/SMS/urgent) |
| `supabase/functions/order-handoff/index.ts` | Order delivery (webhook/email/SMS/print) |

### Shared Backbone (_shared/)
| File | Purpose |
|------|---------|
| `_shared/cors.ts` | `corsHeaders`, `jsonResponse()`, `errorResponse()` — used by every function |
| `_shared/tenant.ts` | `requireAuthedTenant()`, `serviceClient()`, `requireInternalSecret()` |
| `_shared/sentry.ts` | `captureException()`, `withSentry()` — error tracking |
| `_shared/buildBusinessContext.ts` | Assembles `BusinessContext` for all AI interactions |
| `_shared/voiceContextContract.ts` | 300+ dynamic variables registry, `buildDynamicVariablesFromRegistry()` |
| `_shared/getBusinessBrainSnapshot.ts` | Fetches complete Business Brain data from DB |
| `_shared/resolveCapabilities.ts` | `resolveCapabilities()` — mode + modules → capability flags |
| `_shared/agentResolver.ts` | `getAgentIdForMode()` — routes to correct ElevenLabs agent |
| `_shared/agentBasePrompts.ts` | Mode-specific system prompts + natural speech rules |
| `_shared/agentToolsConfig.ts` | ElevenLabs tool definitions per business mode |
| `_shared/computeQuote.ts` | Pricing engine: `computePriceQuote()`, `computeEtaEstimate()` |
| `_shared/emitEvent.ts` | `emitEvent()` → log to ai_event_logs + trigger-workflow |
| `_shared/sanitizeName.ts` | `isPlaceholderName()`, `sanitizeCustomerName()` |
| `_shared/inputValidators.ts` | Address, Date, Time, Miles, Email, Phone validators |

### Frontend Core
| File | Purpose |
|------|---------|
| `src/App.tsx` | All routing — 4 layout groups (App, Admin, Driver, Public) |
| `src/contexts/AuthContext.tsx` | User/session/tenant/role state, admin tenant switching |
| `src/contexts/AdminModeContext.tsx` | Super admin mode switching |
| `src/components/layouts/AppLayout.tsx` | Main app shell — sidebar, mobile nav, subscription gating, module visibility |
| `src/components/layouts/AdminLayout.tsx` | Admin shell (super_admin only) |
| `src/hooks/useTenantConfig.ts` | `businessMode`, `enabledModules`, `hipaaMode`, `capabilities` |
| `src/hooks/useCapabilities.ts` | Individual capability flags (hasBooking, hasDispatchQueue, etc.) |
| `src/integrations/supabase/client.ts` | Supabase client with auto-refresh |
| `src/integrations/supabase/types.ts` | Auto-generated DB types (100+ tables) |
| `src/types/database.ts` | Extended types: Tenant, Customer, Booking, AICallSession, BusinessMode |
| `src/types/workflow.ts` | WorkflowTrigger, WorkflowNode, WorkflowRun types |
| `src/config/pricing.ts` | Plan tiers: base-200 ($249), growth-2000 ($799), scale-5000 ($1699), power-10000 ($2999) |
| `src/config/essentialFields.ts` | Required/recommended fields per mode for go-live |
| `src/lib/utils.ts` | `cn()` — Tailwind class merging (clsx + tailwind-merge) |

### Key Pages
| Page | Route | Purpose |
|------|-------|---------|
| `DashboardPage` | `/app/dashboard` | SetupWizard (new) or LiveDashboard (ready) |
| `UnifiedInboxPage` | `/app/inbox` | Calls/Leads tabs with filters & detail panel |
| `BookingsPage` | `/app/bookings` | Calendar + booking list |
| `BusinessBrainPage` | `/app/business-brain` | Hub view + all knowledge editors |
| `IntegrationsPage` | `/app/integrations` | Automations, workflows, third-party |
| `AIAssistantPage` | `/app/ai-assistant` | Voice settings, tone, greeting |
| `SettingsPage` | `/app/settings` | Tenant, user, phone, hours |
| `GoLivePage` | `/app/go-live` | Stripe checkout + readiness checklist |
| `DispatchPage` | `/app/dispatch` | Dispatch queue + job management |
| `OrdersPage` | `/app/orders` | Food order management |
| `ReportsROIPage` | `/app/reports` | ROI + revenue attribution |

## DATABASE SCHEMA — Essential Tables

### Identity & Tenancy
- **tenants** — id, business_name, business_mode (enum: service|dispatch|food|medical|general), enabled_modules (JSONB array), capabilities_json, hipaa_mode, hours_json, pricing_rules_jsonb, eta_policy_jsonb, busyness_rules_jsonb, service_area_json, context_fields_json
- **tenant_users** — tenant_id, user_id, role (enum: owner|manager|staff|viewer). UNIQUE(tenant_id, user_id)
- **customers** — tenant_id, phone_e164 (UNIQUE together), phone_raw, full_name, email, tags[], source. `resolve_customer()` RPC handles upsert + conflict detection
- **customer_merge_queue** — conflict_type (name_mismatch|email_mismatch|both_mismatch), resolved flag

### AI & Voice
- **ai_call_sessions** — tenant_id, customer_id, twilio_call_sid, elevenlabs_conversation_id, transcript, summary, extracted_payload (JSONB = CanonicalPayload), outcome (booked|followup|lost|escalated), started_at, ended_at
- **ai_event_logs** — tenant_id, session_id, stage, event_data (JSONB). Stages: webhook_received, extraction_canonicalized, normalization_applied, summary_saved, customer_resolved, derived_entity_created
- **assistant_settings** — tenant_id (1:1), voice_ai_enabled, tone, greeting_script, fallback_script, same_day_enabled, waitlist_enabled, deposit_required, service_default_flow, unknown_question_behavior

### Entities (Created by Deterministic Routing)
- **bookings** — tenant_id, customer_id, service_id, session_id, scheduled_at, status (pending|confirmed|completed|canceled|no_show), notes
- **dispatch_jobs** — tenant_id, customer_id, job_number, status (pending|assigned|en_route|on_site|completed|cancelled), priority (low|normal|high|urgent), pickup/dropoff addresses + lat/lng, session_id, price_cents
- **food_orders** — tenant_id, customer_id, order_number, order_type (pickup|delivery), items_json (JSONB), subtotal/tax/total_cents, status (pending→confirmed→preparing→ready→out_for_delivery→completed→cancelled), session_id
- **reservations** — tenant_id, customer_id, party_size, reservation_date/time, status, special_requests
- **medical_intakes** — tenant_id, customer_id, intake_type, urgency_level, reason_for_visit, verbal_consent_given (HIPAA)

### Knowledge & Intelligence
- **business_faqs** — tenant_id, question, answer, priority_weight
- **objection_responses** — tenant_id, objection, response, priority_weight
- **knowledge_gaps** — tenant_id, gap_type, description, customer_question, occurrence_count, resolved
- **call_outcomes** — tenant_id, session_id, outcome_type, intent, conversion_value_cents, ai_handled_fully
- **business_patterns** — tenant_id, pattern_type (time|service_trend|objection|conversion|capacity|upsell), pattern_key (UNIQUE with tenant+type), confidence_score, observation_count, is_actionable
- **intelligence_insights** — tenant_id, insight_type, severity, title, description, recommended_action, is_read, is_actioned
- **revenue_attributions** — tenant_id, session_id, entity_type, entity_id, revenue_cents, UNIQUE(tenant_id, entity_type, entity_id). Auto-created by triggers on booking/dispatch_job/food_order insert

### Services & Pricing
- **services** — tenant_id, name, duration_minutes, price_type (fixed|quote_only|deposit_based), price_amount, is_active, upsell_suggestions[]
- **menu_items** — tenant_id, name, category, price_cents, dietary_tags[], prep_time_minutes
- **price_modifiers** — tenant_id, modifier_type, adjustment_type (fixed|percentage|multiplier), adjustment_value, applies_to_services[], active_days[]

### Automation & Delivery
- **automation_rules** — tenant_id, trigger_event, destination_provider, action_type, integration_id, field_mapping_json, behavior_json
- **automation_runs** — tenant_id, rule_id, trigger_event, entity_type, entity_id, status (pending|running|success|failed|skipped), payload_snapshot
- **handoff_attempts** — tenant_id, entity_type, entity_id, method, status, error_message
- **integrations** — tenant_id, provider (UNIQUE together), status, auth_type, config_json

### RLS Patterns
- **Pattern 1:** `has_tenant_access(auth.uid(), tenant_id)` — checks tenant_users membership
- **Pattern 2:** `tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())`
- **Pattern 3:** Role-based — owner-only or super_admin bypass
- All user-facing tables enforce tenant isolation via RLS

## EDGE FUNCTIONS CATALOG (86 total)

### By Domain
| Domain | Functions | Key Ones |
|--------|-----------|----------|
| Voice (Twilio/ElevenLabs) | 13 | twilio-inbound, elevenlabs-webhook, elevenlabs-init, elevenlabs-conversation-token |
| ElevenLabs Agent Tools | 10 | elevenlabs-suggest-availability, elevenlabs-check-availability, elevenlabs-create-booking, elevenlabs-create-dispatch-job, elevenlabs-check-service-area, elevenlabs-cancel-booking, elevenlabs-add-to-waitlist, elevenlabs-create-callback, elevenlabs-lookup-dispatch-status |
| Booking & Calendar | 10 | booking-handoff, availability-suggest, check-availability, compute-available-slots, create-calendar-event, calendar-oauth-start/callback, sync-availability, refresh-calendar-list, cron-calendar-sync |
| Dispatch | 12 | dispatch-handoff, create-dispatch-request, compute-distance-eta, eta-route, optimize-route, check-impound, get-impound-lot-info, get-impound-release-info |
| Orders | 2 | order-handoff, print-receipt |
| Intelligence | 9 | process-call-outcome, detect-patterns, generate-insights, build-weekly-digest, retrieve-business-memory, retrieve-intent-rules, record-observation, get-intelligence-dashboard, analyze-call-outcome |
| Lead Recovery | 7 | start-lead-recovery, check-recovery-context, process-recovery-response, execute-recovery-action, complete-lead-recovery, run-recovery-scheduler, retry-failed-deliveries |
| Knowledge | 2 | retrieve-knowledge, process-knowledge-upload |
| Estimates | 4 | estimate-generate-pdf, estimate-public-view, estimate-public-action, estimate-send-email |
| Admin | 6 | admin-reset-password, create-tenant, cleanup-test-users, seed-test-tenants, health-db, provision-twilio-number |
| Billing | 3 | track-usage, get-usage-status, stripe-webhook |
| Delivery | 2 | universal-delivery, check-handoff-failures |
| Other | 6 | trigger-workflow, manage-session-locks, ai-text-reply, ai-plan-response, copilot-context, record-audit-event |

### Auth Patterns in Edge Functions
- **JWT auth:** `requireAuthedTenant(req)` — verifies Supabase JWT, resolves tenant membership
- **Service role:** `serviceClient()` — unrestricted DB access for system operations
- **Internal secret:** `requireInternalSecret(req)` — `x-closeloop-secret` header for AI/internal calls
- **Admin secret:** `requireAdminSecret(req)` — `x-admin-secret` for sensitive operations

### Cron Functions (7)
- `cron-calendar-sync` — every 5 min, syncs all active calendar connections
- `generate-insights` — daily, synthesizes patterns into actionable insights
- `build-weekly-digest` — weekly, comprehensive metrics summary
- `check-handoff-failures` — monitors failed deliveries, sends alerts
- `run-recovery-scheduler` — schedules next lead recovery actions
- `retry-failed-deliveries` — retries with exponential backoff (5 min base, 2x multiplier)
- `detect-patterns` — auto-triggered from process-call-outcome

## FRONTEND ARCHITECTURE

### Routing (App.tsx — 4 Layout Groups)
- **Public:** Landing, Pricing, Login, Signup, `/estimate/:id`, `/portal/:tenantId`
- **App (AppLayout):** Dashboard, Inbox, Bookings, Business Brain, Settings, Integrations, AI Assistant, Orders, Dispatch, Fleet, Medical, Catering, Reservations, Reports, Estimates, Agreements, Help
- **Admin (AdminLayout, super_admin only):** Overview, Tenants, Demo Library, Golden Path QA, Support, Setup Requests
- **Driver (DriverLayout):** Jobs, Vehicle, Impound Log
- **Debug (admin only):** Telephony, AI Context, Availability, Extraction debuggers

### Key Redirects
- `/app/services` → `/app/business-brain?section=services`
- `/app/automations` → `/app/integrations`
- `/app/menu-center` → `/app/business-brain`

### State Management
- **Server state:** TanStack React Query (95+ custom hooks)
- **Global state:** AuthContext (user/tenant/role), AdminModeContext (mode switching)
- **No Redux/Zustand** — pure React Context + React Query
- **Realtime:** Supabase `postgres_changes` subscriptions for bookings, conversations, etc.

### Module Visibility (AppLayout)
- Reads `useTenantConfig().enabledModules`
- Shows Bookings if `modules.includes("booking")`
- Shows Dispatch if `caps.hasDispatchQueue`
- Shows Orders if `modules.includes("food_orders")`
- Subscription gating: Lock icon on disabled features, redirect to `/app/go-live` if no subscription (unless super_admin)

### Key Hooks
| Hook | Purpose |
|------|---------|
| `useAuth()` | User, session, tenant, role, subscription, admin tenant switching |
| `useTenantConfig()` | businessMode, enabledModules, hipaaMode, capabilities |
| `useCapabilities()` | Individual flags: hasAiVoice, hasBooking, hasDispatchQueue, etc. |
| `useBookings()` | CRUD + stats + realtime subscriptions |
| `useLeads()` | Lead CRUD + stats |
| `useCustomers()` | Customer CRUD (unique: tenant_id + phone_e164) |
| `useConversations()` | Call/message threads |
| `useServices()` | Service catalog |
| `useAssistantSettings()` | AI config per tenant (auto-creates if missing) |
| `useAIReadinessV2()` | canGoLive boolean + p0Flags blocking issues |
| `useBrainCompletion()` | Business Brain progress scores |
| `useEssentialFieldStatus()` | Required field checklist per mode |
| `useWorkflows()` | Automation rules |
| `useROIDashboard()` | Revenue attribution metrics |
| `useIntelligenceSettings()` | Memory/learning config (respects HIPAA) |

### Component Domains (61 directories)
Major: `admin/`, `ai/`, `brain/` (largest — all knowledge editors), `dashboard/` (51 files), `bookings/`, `calls/`, `leads/`, `customers/`, `dispatch/`, `orders/`, `availability/`, `calendar/`, `estimates/`, `agreements/`, `integrations/`, `automations/`, `intelligence/`, `notifications/`, `settings/`, `debug/`, `layouts/`, `ui/` (51 shadcn/ui components)

### Static Data (`src/data/`)
- `industryCatalog.ts` — 100+ industry definitions with slug, businessMode, enabledModules, services, FAQs
- `industryTemplates.ts` — Base templates per mode (services, policies, FAQs, hours)
- `automationTemplates.ts` — Pre-built workflow templates per category
- `industryDemos.ts` — "Hear How It Works" demo call references
- `testTenantMatrix.ts` — Demo tenant configs for admin QA

## CANONICAL PAYLOAD STRUCTURE

The single source of truth for extracted call data:

```typescript
interface CanonicalPayload {
  intent: "order" | "reservation" | "booking" | "dispatch" | "callback" | "faq" | "other"
  customer: { name, phone_e164, email }
  order: { type: "pickup"|"delivery", items[], special_instructions, delivery_address, total_cents }
  reservation: { date (YYYY-MM-DD), time (HH:MM), party_size, notes }
  booking: { service_requested, service_id, preferred_date, preferred_time, confirmed }
  dispatch: { pickup_address, dropoff_address, vehicle_type, drivable, urgency, job_type }
  callback: { requested, best_time, message }
  quote?: { price?: QuoteResult, eta?: QuoteResult }
  _meta: { extraction_source, normalized_at, tenant_timezone, raw_data_collection_keys }
}
```

## BUSINESS MODES & DEFAULT MODULES

```
service:  [ai_voice, instant_text_back, booking]
dispatch: [ai_voice, instant_text_back, dispatch_queue]
food:     [ai_voice, instant_text_back, food_orders, menu_knowledge, reservations]
medical:  [ai_voice, instant_text_back, booking, medical_intake]
general:  [ai_voice, instant_text_back]
```

Capability resolution priority: `capabilities_json` > `enabled_modules` > mode defaults.

## KNOWN GOTCHAS & LESSONS LEARNED

1. **Null propagation to ElevenLabs** — ElevenLabs fails silently on null dynamic variables. Always coerce to empty string `""`. The `voiceContextContract.ts` handles this but watch for new variables.
2. **Phone normalization** — Easy to miss E.164 format. Always use `normalizePhoneE164()` from _shared. Unique constraint is (tenant_id, phone_e164), NOT raw phone.
3. **Module gating before entity creation** — Always check `enabled_modules` before creating bookings/orders/dispatch. The routing in `determineRoutingTarget()` handles this but any new entity creation paths must also check.
4. **HIPAA scope creep** — HIPAA applies ONLY to `business_mode='medical'` tenants. Memory recording disabled in HIPAA mode. Never add HIPAA restrictions to non-medical flows.
5. **RLS silent filtering** — Missing `tenant_id` in WHERE clause doesn't error — it just returns empty results. If a query returns nothing unexpectedly, check RLS.
6. **Duplicate webhook delivery** — ElevenLabs may send the same webhook twice. Idempotency check via `ended_at` already set on `ai_call_sessions`.
7. **Session lookup fallback** — If conversation_id extraction from TwiML fails, webhook falls back to searching by tenant_id + caller_phone. This can match wrong session if caller has multiple recent calls.
8. **Twilio MUST return 200** — Any non-200 from twilio-inbound causes Twilio to retry and the caller hears silence. Always wrap in try-catch returning valid TwiML.
9. **Hardcoded demo data** — NEVER put fake/demo data in product paths. All pages must read from DB. Demo data only in admin/test routes.
10. **Business Brain duplication** — "Order Settings" and "Distance Pricing" appear in 2 places each in the Brain UI. Be careful editing one without the other.
11. **Food mode service types** — The food mode discovery flow for service types is not obvious to users. May need UX attention.
12. **Dispatch policy complexity** — 9 sections in Policies tab for dispatch mode; can overwhelm users.
13. **Email is placeholder** — Email delivery in handoffs is logged but not actually sent yet. Needs Resend/SendGrid integration.
14. **HIPAA auto-purge not automated** — Medical tenants need a scheduled job for data retention enforcement (retention_days in medical_settings).
15. **Revenue attribution triggers** — Auto-created by DB triggers on booking/dispatch_job/food_order INSERT with session_id. If entity created without session_id, no attribution is recorded.

## DYNAMIC VARIABLES (300+ for ElevenLabs)

Categories: core (tenant_id, business_name, business_mode, enabled_modules, timezone), caller (caller_phone, customer_id, customer_order_count), hours (hours_today, booking_link), offerings (service_summary, menu_summary, packages_summary), pricing (pricing_rules_summary, eta_rules_summary, response_time_spoken), policies (cancellation_policy, faqs_summary, ai_guidelines_summary), ai_settings (tone, greeting_script, ai_booking_mode), intelligence (required_questions_summary, memory_hints_summary), food (estimated_prep_minutes, accepts_pickup), debug, meta.

**HIPAA Safe:** All variables safe except `caller_phone` (redacted) and `memory_hints_summary` (empty) in HIPAA mode.

**Size Limit:** Compact JSON capped at 12KB.

## GROWING KNOWLEDGE

> Add new discoveries, patterns, and preferences below as they come up in development sessions.

### User Preferences
<!-- Add coding style preferences, PR conventions, priorities as discovered -->

### Patterns Discovered
<!-- Add recurring patterns, useful abstractions, or common approaches -->

### Bugs & Fixes Log
<!-- Record significant bugs fixed and their root causes for future reference -->

### Architecture Decisions
<!-- Record decisions made and their reasoning -->
- **Business Brain lockdown:** Only `/app/business-brain` can edit business knowledge; other pages read-only with "Edit in Business Brain" CTAs
- **Slider exception:** Mode/industry sliders write ONLY via `writeBrainFact.ts` functions
- **No silent overwrites:** Knowledge uploads go to Review Queue; require explicit approval
- **Multi-tenant via RLS:** All queries must include tenant_id filter (enforced at DB level)
- **Canonical payload first:** Extract to canonical form before creating any entity
- **Voice script generation:** Output must be ready to speak without post-processing
- **Deterministic routing:** Same inputs → same outputs, no AI flakiness in routing

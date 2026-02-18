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

---

# MEMORY — Accumulated Architectural Knowledge

> This section is the permanent memory. It grows organically as the codebase evolves. When you learn something new about CloseLoop, add it here.

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
- **Workflow Configuration System (2026-02-17):** ALL agent prompts are now configuration-driven with ZERO hard-coded business logic. Every business gets unique AI behavior via Business Brain → Workflow Config tab. Agent prompts read from `workflow_config` dynamic variables (60+ settings across 5 modes). Priority: `workflow_config` > mode defaults.
- **Context optimization (2026-02-17):** Detailed reference docs (golden path trace, DB schema, edge function catalog, ElevenLabs standards, frontend architecture, key file index, workflow system, canonical payload, dynamic variables) moved to `.claude/rules/` with path-scoped loading. Only loads when editing matching files.

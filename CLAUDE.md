# CloseLoop Operating Rules

This document defines the operating rules for all development work on the CloseLoop platform.

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

## PROJECT STRUCTURE

```
closeloop/
├── src/
│   ├── components/     # React components organized by domain
│   │   ├── admin/      # Admin dashboard components
│   │   ├── bookings/   # Booking management
│   │   ├── brain/      # Business brain / AI config
│   │   ├── calendar/   # Calendar integration
│   │   ├── customers/  # Customer management
│   │   ├── dashboard/  # Main dashboard
│   │   ├── dispatch/   # Dispatch/towing operations
│   │   ├── estimates/  # Estimate generation
│   │   ├── knowledge/  # Knowledge base management
│   │   ├── leads/      # Lead tracking
│   │   ├── orders/     # Order management
│   │   └── ui/         # shadcn/ui base components
│   ├── config/         # App configuration
│   ├── contexts/       # React contexts
│   ├── data/           # Static data / constants
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # Supabase client setup
│   ├── lib/            # Utility functions
│   ├── pages/          # Route-level page components
│   └── types/          # TypeScript type definitions
├── supabase/
│   ├── functions/      # Edge Functions (Deno)
│   │   ├── _shared/    # Shared utilities across functions
│   │   ├── twilio-inbound/          # Call intake (GOLDEN PATH entry)
│   │   ├── elevenlabs-webhook/      # Conversation results (GOLDEN PATH)
│   │   ├── booking-handoff/         # Booking automation
│   │   ├── dispatch-handoff/        # Dispatch automation
│   │   ├── order-handoff/           # Order automation
│   │   └── ...70+ more functions
│   └── migrations/     # PostgreSQL migrations
├── tests/              # Test files
└── docs/               # Documentation
```

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

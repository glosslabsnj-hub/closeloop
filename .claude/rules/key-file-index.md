---
paths:
  - "supabase/**"
  - "src/**"
---
# Key File Index

## Golden Path Files (Touch With Extreme Care)
| File | Purpose |
|------|---------|
| `supabase/functions/twilio-inbound/index.ts` | Call intake entry, builds context, registers with ElevenLabs |
| `supabase/functions/elevenlabs-webhook/index.ts` | Call completion, canonical payload, routing, entity creation |
| `supabase/functions/booking-handoff/index.ts` | Booking delivery (webhook/email/SMS) |
| `supabase/functions/dispatch-handoff/index.ts` | Dispatch delivery (webhook/email/SMS/urgent) |
| `supabase/functions/order-handoff/index.ts` | Order delivery (webhook/email/SMS/print) |

## Shared Backbone (_shared/)
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

## Frontend Core
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

---
paths:
  - "src/**"
---
# Frontend Architecture

## Routing (App.tsx — 4 Layout Groups)
- **Public:** Landing, Pricing, Login, Signup, `/estimate/:id`, `/portal/:tenantId`
- **App (AppLayout):** Dashboard, Inbox, Bookings, Business Brain, Settings, Integrations, AI Assistant, Orders, Dispatch, Fleet, Medical, Catering, Reservations, Reports, Estimates, Agreements, Help
- **Admin (AdminLayout, super_admin only):** Overview, Tenants, Demo Library, Golden Path QA, Support, Setup Requests
- **Driver (DriverLayout):** Jobs, Vehicle, Impound Log
- **Debug (admin only):** Telephony, AI Context, Availability, Extraction debuggers

## Key Redirects
- `/app/services` → `/app/business-brain?section=services`
- `/app/automations` → `/app/integrations`
- `/app/menu-center` → `/app/business-brain`

## State Management
- **Server state:** TanStack React Query (95+ custom hooks)
- **Global state:** AuthContext (user/tenant/role), AdminModeContext (mode switching)
- **No Redux/Zustand** — pure React Context + React Query
- **Realtime:** Supabase `postgres_changes` subscriptions for bookings, conversations, etc.

## Module Visibility (AppLayout)
- Reads `useTenantConfig().enabledModules`
- Shows Bookings if `modules.includes("booking")`
- Shows Dispatch if `caps.hasDispatchQueue`
- Shows Orders if `modules.includes("food_orders")`
- Subscription gating: Lock icon on disabled features, redirect to `/app/go-live` if no subscription (unless super_admin)

## Key Hooks
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

## Component Domains (61 directories)
Major: `admin/`, `ai/`, `brain/` (largest — all knowledge editors), `dashboard/` (51 files), `bookings/`, `calls/`, `leads/`, `customers/`, `dispatch/`, `orders/`, `availability/`, `calendar/`, `estimates/`, `agreements/`, `integrations/`, `automations/`, `intelligence/`, `notifications/`, `settings/`, `debug/`, `layouts/`, `ui/` (51 shadcn/ui components)

## Static Data (`src/data/`)
- `industryCatalog.ts` — 100+ industry definitions with slug, businessMode, enabledModules, services, FAQs
- `industryTemplates.ts` — Base templates per mode (services, policies, FAQs, hours)
- `automationTemplates.ts` — Pre-built workflow templates per category
- `industryDemos.ts` — "Hear How It Works" demo call references
- `testTenantMatrix.ts` — Demo tenant configs for admin QA

## Key Pages
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

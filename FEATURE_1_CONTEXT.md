# Feature 1 Implementation Context

## Project Overview

CloseLoop is a multi-industry AI phone agent platform that helps local business owners (plumbers, tow companies, restaurants, salons, medical offices) automate their inbound calls, bookings, and operations. The AI answers calls via ElevenLabs + Twilio, qualifies leads, creates bookings/orders/dispatch jobs, and hands off to the owner.

**Users:** Non-tech-savvy local business owners, busy, need things to "just work."

**North Star:** "Every lead gets answered. Every opportunity gets pushed to booking."

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3.1 + TypeScript 5.8.3 + Vite 5.4.19 |
| UI Library | Tailwind CSS 3.4.17 + shadcn/ui (Radix primitives) |
| State Management | TanStack Query v5 (React Query) |
| Routing | React Router v6 |
| Charts | **Recharts 2.15.4** (already installed, shadcn wrapper at `src/components/ui/chart.tsx`) |
| Backend | Supabase (PostgreSQL + Edge Functions + Auth + Realtime) |
| Auth | Supabase Auth via `AuthContext.tsx` |
| Icons | Lucide React 0.462.0 |
| Toasts | Sonner 1.7.4 |
| Date Utils | date-fns 3.6.0 |
| Forms | React Hook Form + Zod |
| Voice AI | ElevenLabs |
| Telephony | Twilio |
| Payments | Stripe |
| Maps | Mapbox |

---

## Database Schema

### Core Tables Relevant to Revenue Attribution

#### `ai_call_sessions` (the origin of AI-attributed revenue)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| tenant_id | uuid | FK to tenants |
| twilio_call_sid | text | Twilio call identifier |
| elevenlabs_conversation_id | text | ElevenLabs conversation ID |
| caller_phone | text | Caller phone (E.164) |
| customer_id | uuid | FK to customers (resolved during call) |
| lead_id | uuid | FK to leads |
| booking_id | uuid | FK to bookings (if booking created) |
| opportunity_id | uuid | FK to opportunities |
| outcome | enum | `booked`, `followup`, `lost`, `escalated`, `order`, `dispatch`, `message`, `lead_captured` |
| call_direction | enum | `inbound`, `outbound` |
| started_at | timestamptz | Call start |
| ended_at | timestamptz | Call end |
| summary | text | AI-generated call summary |
| transcript | text | Full call transcript |
| extracted_payload | jsonb | Canonical payload from ElevenLabs webhook |
| context_json | jsonb | Business context snapshot |

#### `bookings` (service mode revenue)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| tenant_id | uuid | FK to tenants |
| lead_id | uuid | FK to leads |
| service_id | uuid | FK to services (has pricing) |
| **session_id** | uuid | **FK to ai_call_sessions** (AI attribution link!) |
| status | enum | `pending_deposit`, `confirmed`, `completed`, `canceled`, `no_show` |
| start_at | timestamptz | Booking start time |
| end_at | timestamptz | Booking end time |
| deposit_required | boolean | |
| deposit_paid | boolean | |
| stripe_payment_intent_id | text | Stripe payment |
| notes | text | |
| **No direct value column** | - | Must derive from `services.price_amount` |

#### `dispatch_jobs` (dispatch mode revenue)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| tenant_id | uuid | FK to tenants |
| job_number | text | Human-readable ID (DSP-YYMMDD-XXXX) |
| customer_id | uuid | FK to customers |
| **session_id** | uuid | **FK to ai_call_sessions** (AI attribution link!) |
| **price_cents** | integer | **Direct value column!** |
| status | enum | `pending`, `assigned`, `en_route`, `on_site`, `completed`, `cancelled` |
| priority | enum | `low`, `normal`, `high`, `urgent` |
| job_type | text | tow, delivery, repair, lockout, etc. |
| pickup_address, dropoff_address | text | Addresses |
| pickup_lat/lng, dropoff_lat/lng | numeric | Coordinates |
| scheduled_at | timestamptz | Scheduled time |
| completed_at | timestamptz | Completion time |

#### `food_orders` (food mode revenue)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| tenant_id | uuid | FK to tenants |
| order_number | text | Human-readable ID |
| customer_id | uuid | FK to customers |
| **session_id** | uuid | **FK to ai_call_sessions** (AI attribution link!) |
| **subtotal_cents** | integer | **Subtotal value!** |
| **tax_cents** | integer | Tax amount |
| **total_cents** | integer | **Total value!** |
| items_json | jsonb | Order items array |
| totals_estimate | jsonb | AI-estimated totals |
| status | enum | `pending`, `confirmed`, `preparing`, `ready`, `out_for_delivery`, `completed`, `cancelled`, `needs_followup` |
| order_type | text | pickup, delivery, dine-in |

#### `services` (pricing source for bookings)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| tenant_id | uuid | FK to tenants |
| name | text | Service name |
| price_amount | numeric | **Price in dollars (not cents!)** |
| price_type | enum | `fixed`, `starting_at`, `quote_only` |
| duration_minutes | integer | |
| deposit_amount | numeric | |

#### `opportunities` (sales pipeline tracking)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| tenant_id | uuid | FK to tenants |
| customer_id | uuid | FK to customers |
| service_id | uuid | FK to services |
| value_cents | integer | Estimated deal value |
| source | text | Lead source |
| status | text | Pipeline stage |

#### `subscriptions` (billing - for ROI calculation)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| tenant_id | uuid | FK to tenants (one-to-one) |
| plan_code | enum | Legacy codes |
| status | enum | `active`, `trialing`, `past_due`, `canceled` |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| included_minutes | integer | |
| included_sms_segments | integer | |
| overage_minute_rate_cents | integer | |
| current_period_end | timestamptz | |
| **No monthly_price column** | - | Must derive from plan_code → LADDER_STEPS |

#### `tenants` (business mode & config)
| Key Column | Type | Purpose |
|------------|------|---------|
| id | uuid | PK |
| name | text | Business name |
| business_mode | enum | `service`, `dispatch`, `food`, `medical`, `general` |
| enabled_modules | text[] | Array of enabled module slugs |
| industry_type | enum | Specific industry (plumber, towing, etc.) |
| timezone | text | Business timezone |
| hours_json | jsonb | Operating hours |
| ai_enabled | boolean | |

### Key Relationships for Revenue Attribution

```
ai_call_sessions
  └─ session_id → bookings.session_id     (service mode)
  └─ session_id → dispatch_jobs.session_id (dispatch mode)
  └─ session_id → food_orders.session_id   (food mode)

bookings.service_id → services.price_amount (to get booking value)
dispatch_jobs.price_cents                   (direct value)
food_orders.total_cents                     (direct value)
```

**Critical Insight:** The `session_id` foreign key already exists on all three revenue tables, linking them to AI calls. We can determine AI-attributed revenue by checking `WHERE session_id IS NOT NULL`.

### RLS Pattern (from existing migrations)
```sql
ALTER TABLE some_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON some_table
  FOR ALL USING (tenant_id = auth.uid()::text)
  -- OR using a helper function:
  FOR ALL USING (has_tenant_access(tenant_id));
```

---

## Business Modes

| Mode | Primary Revenue Table | Value Source | Entity Name | Action Verb | Completed Status |
|------|----------------------|-------------|-------------|-------------|-----------------|
| `service` | bookings | services.price_amount (dollars) | Appointments/Bookings | booked | `completed` |
| `dispatch` | dispatch_jobs | price_cents (cents) | Jobs | dispatched | `completed` |
| `food` | food_orders | total_cents (cents) | Orders | placed | `completed` |
| `medical` | bookings | services.price_amount (dollars) | Appointments | scheduled | `completed` |
| `general` | bookings | services.price_amount (dollars) | Bookings | booked | `completed` |

### Value Calculation Notes
- **bookings**: No direct value. Must JOIN `services` on `service_id` and use `price_amount` (in DOLLARS, not cents). Some services are `quote_only` or `starting_at` - need fallback.
- **dispatch_jobs**: Has `price_cents` directly (in CENTS). May be null for new jobs.
- **food_orders**: Has `total_cents` directly (in CENTS). Also has `subtotal_cents` and `tax_cents`.

---

## Existing Edge Functions Relevant to Feature 1

| Function | Purpose | Revenue Attribution Relevance |
|----------|---------|------------------------------|
| `elevenlabs-create-booking` | Creates bookings during AI calls | Sets `session_id` on booking |
| `elevenlabs-create-dispatch-job` | Creates dispatch jobs during AI calls | Sets `session_id` on dispatch job |
| `elevenlabs-webhook` | Post-conversation processing | Extracts canonical payload, routes to entity creation |
| `booking-handoff` | Notifies owner of new bookings | Records audit_events, triggers workflows |
| `dispatch-handoff` | Notifies owner of new dispatch jobs | Records audit_events, triggers workflows |
| `order-handoff` | Notifies owner of new food orders | Records audit_events, triggers workflows |
| `track-usage` | Records voice/SMS consumption | Could be extended for revenue tracking |
| `get-usage-status` | Returns usage/billing data | Pattern for our ROI endpoint |
| `stripe-webhook` | Handles Stripe events | Manages subscription status |
| `record-audit-event` | Audit trail | Already logs booking.confirmed, order.created, etc. |

---

## Frontend Structure

### File Locations
| What | Path |
|------|------|
| Pages | `src/pages/app/` (42 app pages) |
| Hooks | `src/hooks/` (62+ hooks) |
| Components | `src/components/` (31 feature dirs) |
| UI Primitives | `src/components/ui/` (51 shadcn components) |
| Layout | `src/components/layout/` (PageContainer, PageHeader, StatCard) |
| Dashboard Widgets | `src/components/dashboard/` (47 components) |
| Config | `src/config/pricing.ts` |
| Terminology | `src/lib/terminology.ts` |
| Business Mode | `src/hooks/useTenantConfig.ts` |
| Auth | `src/contexts/AuthContext.tsx` |
| Supabase Client | `src/integrations/supabase/client.ts` |
| Supabase Types | `src/integrations/supabase/types.ts` (auto-gen, 211KB) |
| Charts | `src/components/ui/chart.tsx` (Recharts wrapper) |

### Current Dashboard Structure
```
DashboardPage.tsx
├── No subscription → "Choose Your Plan" CTA
├── Not setup → SetupWizard
└── Setup complete → LiveDashboard.tsx
    ├── Greeting header (time-of-day)
    ├── UnifiedAlertBanner
    ├── AgentControlPanel (AI on/off)
    ├── NeedsAttentionBanner
    ├── MetricsGrid (3 cards, mode-specific)
    ├── Grid (3+2 columns):
    │   ├── LiveActivityFeed
    │   └── SetupProgressChecklist
    └── Copilot FAB
```

### Navigation (AppLayout sidebar)
Dynamic nav items built from `enabledModules`:
- Always: Dashboard, Inbox
- Conditional: Bookings, Dispatch, Orders, Reservations, Catering, Patients
- Always: Estimates, Business Brain, Integrations, Test Calls
- Bottom: Help, Settings
- **No existing "Reports" or "Analytics" nav item**

### Routing (App.tsx)
- All app routes under `/app/*`
- **No existing `/app/reports` route**
- Routes wrapped in `<AppLayout>` for sidebar + header

---

## Design Patterns to Follow

### Page Pattern
```tsx
export default function SomePage() {
  const { tenant } = useAuth();
  const { data, isLoading } = useSomeHook(tenant?.id);
  return (
    <PageContainer maxWidth="xl">
      <PageHeader icon={<Icon />} title="Title" description="Desc" action={<Button />} />
      {/* content */}
    </PageContainer>
  );
}
```

### Hook Pattern
```tsx
export function useSomething() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["something", tenant?.id],
    queryFn: async () => { /* supabase query */ },
    enabled: !!tenant?.id,
  });

  // Realtime subscription with cleanup
  useEffect(() => {
    if (!tenant?.id) return;
    const channel = supabase.channel('something-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'something', filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["something", tenant.id] }))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [tenant?.id, queryClient]);

  return { data: query.data, isLoading: query.isLoading };
}
```

### Toast Pattern
```tsx
import { toast } from 'sonner';
toast.success("Saved!");
toast.error("Something went wrong");
```

### Auth Access
```tsx
const { user, tenant, subscription, assistantSettings, hasActiveSubscription } = useAuth();
```

### Industry Terminology
```tsx
import { useTerminology } from '@/hooks/useTerminology';
const terms = useTerminology();
// terms.booking → "job" (dispatch) / "order" (food) / "booking" (service)
```

---

## Subscription Pricing (for ROI calculation)

| SKU | Name | Monthly Price | Minutes |
|-----|------|--------------|---------|
| base-200 | Platform Base | $249 | 200 |
| growth-2000 | Growth | $799 | 2,000 |
| scale-5000 | Scale | $1,699 | 5,000 |
| power-10000 | Power | $2,999 | 10,000 |
| enterprise | Enterprise | Custom | 20,000+ |

**Note:** `subscriptions` table has `plan_code` (legacy enum) but pricing lives in `src/config/pricing.ts`. The subscription table does NOT store monthly price directly. We need to either:
1. Store the subscription cost in a new settings table, OR
2. Map plan_code → LADDER_STEPS.price on the frontend

---

## Terminology by Industry

| Mode | Entity | Plural | Action | Customer | Metric Label |
|------|--------|--------|--------|----------|-------------|
| service | booking | bookings | booked | customer | Bookings |
| dispatch | job | jobs | dispatched | customer | Jobs |
| food | order | orders | placed | guest | Orders |
| medical | appointment | appointments | scheduled | patient | Appointments |
| general | booking | bookings | booked | customer | Bookings |

---

## What Already Exists vs What We Need

### Already Exists
- `session_id` FK on bookings, dispatch_jobs, food_orders (AI attribution link)
- `outcome` enum on ai_call_sessions (booked, order, dispatch, etc.)
- Revenue values: dispatch_jobs.price_cents, food_orders.total_cents
- Service pricing: services.price_amount (for bookings)
- Subscription plans: pricing.ts config
- Terminology system: terminology.ts
- Business mode system: useTenantConfig
- Chart library: Recharts (installed + shadcn wrapper)
- Dashboard component structure (LiveDashboard, MetricsGrid)

### Need to Build
1. **Revenue aggregation queries** - Calculate AI-attributed revenue per month
2. **Revenue stats cache table** - Pre-aggregated monthly stats for fast loading
3. **Revenue settings table** - Default service value, subscription cost override
4. **ROI calculation logic** - (AI revenue - subscription cost) / subscription cost
5. **Dashboard widget** - Prominent ROI card on LiveDashboard
6. **Full report page** - `/app/reports/roi` with charts and breakdowns
7. **Hooks** - useROIDashboard, useROIReport
8. **Navigation** - Add Reports link to sidebar
9. **Settings section** - Revenue tracking configuration

---

## Potential Challenges

1. **Booking value derivation**: Bookings don't store a value - must JOIN services.price_amount. Some services are `quote_only` (no price). Need a fallback/default value.
2. **Currency inconsistency**: services.price_amount is in DOLLARS, dispatch_jobs.price_cents and food_orders.total_cents are in CENTS. Must normalize to cents everywhere.
3. **Null values**: Many entities may have null session_id (manual entries), null price_cents, null service_id. Must handle gracefully.
4. **No historical data**: New feature, existing tenants have no revenue_attributions. Dashboard must work with zero data (empty states).
5. **Real-time vs cached**: Monthly aggregation could be heavy. Need to decide between real-time queries vs materialized/cached stats.
6. **Subscription cost**: Not stored in DB. Must either derive from plan_code or let user set it manually.
7. **Medical mode**: Same table as service mode (bookings) but different terminology. HIPAA considerations for logging.

---

## Open Questions

1. **Should we create a new `revenue_attributions` table, or can we calculate everything from existing session_id joins?** The session_id link already exists - a denormalized attribution table adds complexity but enables faster queries and supports future manual attribution.

2. **How should we handle bookings with `quote_only` services (no price)?** Options: skip them, use tenant's default value, or count them as $0.

3. **Should the ROI calculation use the actual Stripe subscription amount or the plan_code-derived price?** The plan prices are in config but actual billing may differ (discounts, annual, etc.).

4. **Do you want real-time revenue stats (query on every load) or pre-aggregated monthly rollups (faster but slightly delayed)?** For the dashboard widget, real-time is fine. For the full report page with charts, pre-aggregation is better.

5. **For the full report page, do you want it at `/app/reports/roi` or `/app/roi` or somewhere else?**

6. **Should "recovered leads" (leads from missed calls that the AI called back) be tracked separately?** The spec mentions it but the current system doesn't have a clear "recovered" flag.

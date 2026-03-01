-- P2 #14: Add missing indexes for dashboard query performance
--
-- These indexes cover the most common query patterns for dashboard,
-- inbox, and detail pages. Without them, queries do full table scans.

-- ai_call_sessions: dashboard timeline, tenant filtering
CREATE INDEX IF NOT EXISTS idx_ai_call_sessions_tenant_created
  ON public.ai_call_sessions (tenant_id, created_at DESC);

-- ai_call_sessions: customer detail page (customer_id may not exist yet)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_call_sessions' AND column_name='customer_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ai_call_sessions_customer ON public.ai_call_sessions (customer_id) WHERE customer_id IS NOT NULL;
  END IF;
END $$;

-- opportunities: inbox filtering by status and date
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_status_created
  ON public.opportunities (tenant_id, status, created_at DESC);

-- bookings: customer detail, upcoming bookings (customer_id may not exist yet)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='customer_id') THEN
    CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON public.bookings (customer_id, status, start_at) WHERE customer_id IS NOT NULL;
  END IF;
END $$;

-- busy_blocks: slot locking performance (composite for the exact query pattern)
CREATE INDEX IF NOT EXISTS idx_busy_blocks_locking_lookup
  ON public.busy_blocks (session_id, block_type, is_active, expires_at)
  WHERE is_active = true;

-- dispatch_jobs: dashboard queue, status filtering
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_tenant_status
  ON public.dispatch_jobs (tenant_id, status, created_at DESC);

-- food_orders: kitchen display, order tracking
CREATE INDEX IF NOT EXISTS idx_food_orders_tenant_status
  ON public.food_orders (tenant_id, status, created_at DESC);

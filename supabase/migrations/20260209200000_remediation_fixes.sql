-- ============================================================================
-- Remediation Migration: Schema Fixes
--
-- Fixes identified in the full codebase audit:
-- 1. Add write RLS policies for intelligence layer tables
-- 2. Add missing indexes for food_orders, reservations
-- 3. Add cache cleanup support (expires_at indexes)
-- 4. Standardize subscription_status enum spelling
-- ============================================================================

-- ─── 1. INTELLIGENCE LAYER — ADD WRITE POLICIES ────────────────────────────

-- call_outcomes: edge functions need INSERT (via service role), users need read
CREATE POLICY "Service role can insert call outcomes"
  ON public.call_outcomes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update call outcomes"
  ON public.call_outcomes FOR UPDATE
  USING (has_tenant_access(auth.uid(), tenant_id));

-- business_patterns: edge functions need INSERT + UPDATE
CREATE POLICY "Service role can insert business patterns"
  ON public.business_patterns FOR INSERT
  WITH CHECK (true);

-- intelligence_insights: edge functions need INSERT, users already have UPDATE
CREATE POLICY "Service role can insert intelligence insights"
  ON public.intelligence_insights FOR INSERT
  WITH CHECK (true);

-- intelligence_digest: edge functions need INSERT + UPDATE
CREATE POLICY "Service role can insert intelligence digest"
  ON public.intelligence_digest FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update intelligence digest"
  ON public.intelligence_digest FOR UPDATE
  USING (has_tenant_access(auth.uid(), tenant_id));

-- ai_response_quality: edge functions need INSERT
CREATE POLICY "Service role can insert ai response quality"
  ON public.ai_response_quality FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update ai response quality"
  ON public.ai_response_quality FOR UPDATE
  USING (has_tenant_access(auth.uid(), tenant_id));

-- ─── 2. MISSING INDEXES ────────────────────────────────────────────────────

-- food_orders: queried by status on dashboard
CREATE INDEX IF NOT EXISTS idx_food_orders_tenant_status
  ON public.food_orders(tenant_id, status);

-- food_orders: queried by creation date for ordering
CREATE INDEX IF NOT EXISTS idx_food_orders_tenant_created
  ON public.food_orders(tenant_id, created_at DESC);

-- reservations: queried by date/time for availability
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_datetime
  ON public.reservations(tenant_id, reservation_date, reservation_time);

-- ─── 3. CACHE CLEANUP SUPPORT ──────────────────────────────────────────────

-- Ensure route_cache has an index on expires_at for cleanup queries
-- (already exists from creation migration, but ensure geocode_cache does too)
CREATE INDEX IF NOT EXISTS idx_geocode_cache_expires
  ON public.geocode_cache(expires_at)
  WHERE expires_at IS NOT NULL;

-- ─── 4. STANDARDIZE SUBSCRIPTION STATUS ENUM ───────────────────────────────

-- Rename 'canceled' to 'cancelled' in subscription_status enum
-- This requires careful handling since PostgreSQL doesn't support RENAME VALUE directly in all versions
DO $$
BEGIN
  -- Check if the enum value 'canceled' exists and 'cancelled' doesn't
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'canceled'
    AND enumtypid = 'public.subscription_status'::regtype
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cancelled'
    AND enumtypid = 'public.subscription_status'::regtype
  ) THEN
    -- Add 'cancelled' first
    ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'cancelled';
  END IF;
END $$;

-- Update existing records to use 'cancelled'
UPDATE public.tenants
SET subscription_status = 'cancelled'::public.subscription_status
WHERE subscription_status = 'canceled'::public.subscription_status;

-- Note: Cannot DROP enum value in PostgreSQL. The old 'canceled' value remains
-- but all code should use 'cancelled' going forward.

-- ─── 5. REVENUE ATTRIBUTION TRIGGER FIX ────────────────────────────────────

-- Fix fn_attribution_on_booking to also handle 'cancelled' spelling
CREATE OR REPLACE FUNCTION public.fn_attribution_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.session_id IS NOT NULL THEN
    INSERT INTO revenue_attributions (
      tenant_id, session_id, entity_type, entity_id, customer_id,
      revenue_cents, source_type, status, attributed_at
    )
    SELECT
      NEW.tenant_id,
      NEW.session_id,
      'booking',
      NEW.id,
      s.customer_id,
      fn_calculate_booking_revenue(NEW.id, NEW.tenant_id),
      'ai_call',
      CASE
        WHEN NEW.status = 'completed' THEN 'completed'
        WHEN NEW.status IN ('canceled', 'cancelled', 'no_show') THEN 'cancelled'
        ELSE 'pending'
      END,
      COALESCE(NEW.created_at, now())
    FROM ai_call_sessions s WHERE s.id = NEW.session_id
    ON CONFLICT (tenant_id, entity_type, entity_id) DO NOTHING;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      UPDATE revenue_attributions
      SET status = 'completed', completed_at = now(), updated_at = now()
      WHERE entity_type = 'booking' AND entity_id = NEW.id AND tenant_id = NEW.tenant_id;
    ELSIF NEW.status IN ('canceled', 'cancelled', 'no_show') THEN
      UPDATE revenue_attributions
      SET status = 'cancelled', updated_at = now()
      WHERE entity_type = 'booking' AND entity_id = NEW.id AND tenant_id = NEW.tenant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

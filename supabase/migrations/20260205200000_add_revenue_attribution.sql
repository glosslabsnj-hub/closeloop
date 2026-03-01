-- =============================================================================
-- Revenue Attribution & ROI Dashboard Schema
-- =============================================================================
-- Creates tables for tracking AI-attributed revenue and enabling ROI calculations.
-- Three new tables: revenue_attributions, revenue_stats_monthly, tenant_revenue_settings
-- Plus trigger functions to auto-create attributions when AI-created entities are inserted.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. revenue_attributions
-- Links AI calls to revenue-generating entities with a normalized value in cents.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.revenue_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('booking', 'dispatch_job', 'food_order')),
  entity_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  revenue_cents integer NOT NULL DEFAULT 0,
  source_type text NOT NULL DEFAULT 'ai_call' CHECK (source_type IN ('ai_call', 'manual', 'web_form')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  attributed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, entity_type, entity_id)
);

COMMENT ON TABLE public.revenue_attributions IS
  'Denormalized revenue attribution records linking AI calls to revenue entities.';

CREATE INDEX IF NOT EXISTS idx_revenue_attr_tenant_date
  ON public.revenue_attributions(tenant_id, attributed_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_attr_session
  ON public.revenue_attributions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_revenue_attr_status
  ON public.revenue_attributions(tenant_id, status);

-- RLS
ALTER TABLE public.revenue_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant revenue attributions" ON public.revenue_attributions;
CREATE POLICY "Users can view tenant revenue attributions"
  ON public.revenue_attributions FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert tenant revenue attributions" ON public.revenue_attributions;
CREATE POLICY "Users can insert tenant revenue attributions"
  ON public.revenue_attributions FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant revenue attributions" ON public.revenue_attributions;
CREATE POLICY "Users can update tenant revenue attributions"
  ON public.revenue_attributions FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- -----------------------------------------------------------------------------
-- 2. revenue_stats_monthly
-- Pre-aggregated monthly stats. Historical months are snapshotted; current month
-- is calculated real-time on the frontend.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.revenue_stats_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  month date NOT NULL,
  total_calls integer NOT NULL DEFAULT 0,
  calls_answered integer NOT NULL DEFAULT 0,
  entities_created integer NOT NULL DEFAULT 0,
  entities_completed integer NOT NULL DEFAULT 0,
  ai_revenue_cents bigint NOT NULL DEFAULT 0,
  total_revenue_cents bigint NOT NULL DEFAULT 0,
  conversion_rate numeric(5,2) NOT NULL DEFAULT 0,
  avg_entity_value_cents integer NOT NULL DEFAULT 0,
  subscription_cost_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, month)
);

COMMENT ON TABLE public.revenue_stats_monthly IS
  'Pre-aggregated monthly revenue stats for fast historical dashboard queries.';

CREATE INDEX IF NOT EXISTS idx_revenue_stats_tenant_month
  ON public.revenue_stats_monthly(tenant_id, month DESC);

-- RLS
ALTER TABLE public.revenue_stats_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant revenue stats" ON public.revenue_stats_monthly;
CREATE POLICY "Users can view tenant revenue stats"
  ON public.revenue_stats_monthly FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert tenant revenue stats" ON public.revenue_stats_monthly;
CREATE POLICY "Users can insert tenant revenue stats"
  ON public.revenue_stats_monthly FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant revenue stats" ON public.revenue_stats_monthly;
CREATE POLICY "Users can update tenant revenue stats"
  ON public.revenue_stats_monthly FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- -----------------------------------------------------------------------------
-- 3. tenant_revenue_settings
-- Per-tenant configuration for revenue tracking and ROI calculation.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_revenue_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  default_service_value_cents integer NOT NULL DEFAULT 10000,
  subscription_cost_override_cents integer,
  send_monthly_report boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_revenue_settings IS
  'Per-tenant revenue tracking settings. default_service_value_cents=$100 fallback for quote_only services.';
COMMENT ON COLUMN public.tenant_revenue_settings.subscription_cost_override_cents IS
  'Manual override for subscription cost. NULL = auto-derive from plan_code pricing.';

-- RLS
ALTER TABLE public.tenant_revenue_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant revenue settings" ON public.tenant_revenue_settings;
CREATE POLICY "Users can view tenant revenue settings"
  ON public.tenant_revenue_settings FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert tenant revenue settings" ON public.tenant_revenue_settings;
CREATE POLICY "Users can insert tenant revenue settings"
  ON public.tenant_revenue_settings FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant revenue settings" ON public.tenant_revenue_settings;
CREATE POLICY "Users can update tenant revenue settings"
  ON public.tenant_revenue_settings FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- -----------------------------------------------------------------------------
-- 4. Helper: Calculate booking revenue in cents
-- Joins services table; falls back to tenant default or $100.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_calculate_booking_revenue(
  p_booking_id uuid,
  p_tenant_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_price_amount numeric;
  v_default_value integer;
BEGIN
  -- Try to get service price (price_amount is in dollars)
  SELECT s.price_amount INTO v_price_amount
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  WHERE b.id = p_booking_id
    AND s.price_type != 'quote_only'
    AND s.price_amount IS NOT NULL;

  IF v_price_amount IS NOT NULL THEN
    RETURN (v_price_amount * 100)::integer;
  END IF;

  -- Fallback to tenant default
  SELECT default_service_value_cents INTO v_default_value
  FROM tenant_revenue_settings
  WHERE tenant_id = p_tenant_id;

  RETURN COALESCE(v_default_value, 10000);
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. Trigger: Auto-create attribution when booking is created from AI call
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_attribution_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- INSERT: Create attribution if session_id exists (AI-created)
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
        WHEN NEW.status IN ('canceled', 'no_show') THEN 'cancelled'
        ELSE 'pending'
      END,
      COALESCE(NEW.created_at, now())
    FROM ai_call_sessions s WHERE s.id = NEW.session_id
    ON CONFLICT (tenant_id, entity_type, entity_id) DO NOTHING;
  END IF;

  -- UPDATE: Sync status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      UPDATE revenue_attributions
      SET status = 'completed', completed_at = now(), updated_at = now()
      WHERE entity_type = 'booking' AND entity_id = NEW.id AND tenant_id = NEW.tenant_id;
    ELSIF NEW.status IN ('canceled', 'no_show') THEN
      UPDATE revenue_attributions
      SET status = 'cancelled', updated_at = now()
      WHERE entity_type = 'booking' AND entity_id = NEW.id AND tenant_id = NEW.tenant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_attribution ON public.bookings;
CREATE TRIGGER trg_booking_attribution
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_attribution_on_booking();

-- -----------------------------------------------------------------------------
-- 6. Trigger: Auto-create attribution for dispatch jobs from AI calls
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_attribution_on_dispatch_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_default_value integer;
BEGIN
  -- INSERT: Create attribution if session_id exists
  IF TG_OP = 'INSERT' AND NEW.session_id IS NOT NULL THEN
    SELECT default_service_value_cents INTO v_default_value
    FROM tenant_revenue_settings WHERE tenant_id = NEW.tenant_id;

    INSERT INTO revenue_attributions (
      tenant_id, session_id, entity_type, entity_id, customer_id,
      revenue_cents, source_type, status, attributed_at
    ) VALUES (
      NEW.tenant_id,
      NEW.session_id,
      'dispatch_job',
      NEW.id,
      NEW.customer_id,
      COALESCE(NEW.price_cents, v_default_value, 10000),
      'ai_call',
      CASE
        WHEN NEW.status = 'completed' THEN 'completed'
        WHEN NEW.status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
      END,
      COALESCE(NEW.created_at, now())
    )
    ON CONFLICT (tenant_id, entity_type, entity_id) DO NOTHING;
  END IF;

  -- UPDATE: Sync price and status changes
  IF TG_OP = 'UPDATE' THEN
    IF OLD.price_cents IS DISTINCT FROM NEW.price_cents AND NEW.price_cents IS NOT NULL THEN
      UPDATE revenue_attributions
      SET revenue_cents = NEW.price_cents, updated_at = now()
      WHERE entity_type = 'dispatch_job' AND entity_id = NEW.id AND tenant_id = NEW.tenant_id;
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'completed' THEN
        UPDATE revenue_attributions
        SET status = 'completed', completed_at = now(), updated_at = now()
        WHERE entity_type = 'dispatch_job' AND entity_id = NEW.id AND tenant_id = NEW.tenant_id;
      ELSIF NEW.status = 'cancelled' THEN
        UPDATE revenue_attributions
        SET status = 'cancelled', updated_at = now()
        WHERE entity_type = 'dispatch_job' AND entity_id = NEW.id AND tenant_id = NEW.tenant_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_job_attribution ON public.dispatch_jobs;
CREATE TRIGGER trg_dispatch_job_attribution
  AFTER INSERT OR UPDATE ON public.dispatch_jobs
  FOR EACH ROW EXECUTE FUNCTION public.fn_attribution_on_dispatch_job();

-- -----------------------------------------------------------------------------
-- 7. Trigger: Auto-create attribution for food orders from AI calls
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_attribution_on_food_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_default_value integer;
BEGIN
  -- INSERT: Create attribution if session_id exists
  IF TG_OP = 'INSERT' AND NEW.session_id IS NOT NULL THEN
    SELECT default_service_value_cents INTO v_default_value
    FROM tenant_revenue_settings WHERE tenant_id = NEW.tenant_id;

    INSERT INTO revenue_attributions (
      tenant_id, session_id, entity_type, entity_id, customer_id,
      revenue_cents, source_type, status, attributed_at
    ) VALUES (
      NEW.tenant_id,
      NEW.session_id,
      'food_order',
      NEW.id,
      NEW.customer_id,
      COALESCE(NEW.total_cents, v_default_value, 10000),
      'ai_call',
      CASE
        WHEN NEW.status = 'completed' THEN 'completed'
        WHEN NEW.status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
      END,
      COALESCE(NEW.created_at, now())
    )
    ON CONFLICT (tenant_id, entity_type, entity_id) DO NOTHING;
  END IF;

  -- UPDATE: Sync price and status changes
  IF TG_OP = 'UPDATE' THEN
    IF OLD.total_cents IS DISTINCT FROM NEW.total_cents AND NEW.total_cents IS NOT NULL THEN
      UPDATE revenue_attributions
      SET revenue_cents = NEW.total_cents, updated_at = now()
      WHERE entity_type = 'food_order' AND entity_id = NEW.id AND tenant_id = NEW.tenant_id;
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'completed' THEN
        UPDATE revenue_attributions
        SET status = 'completed', completed_at = now(), updated_at = now()
        WHERE entity_type = 'food_order' AND entity_id = NEW.id AND tenant_id = NEW.tenant_id;
      ELSIF NEW.status = 'cancelled' THEN
        UPDATE revenue_attributions
        SET status = 'cancelled', updated_at = now()
        WHERE entity_type = 'food_order' AND entity_id = NEW.id AND tenant_id = NEW.tenant_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_food_order_attribution ON public.food_orders;
CREATE TRIGGER trg_food_order_attribution
  AFTER INSERT OR UPDATE ON public.food_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_attribution_on_food_order();

-- -----------------------------------------------------------------------------
-- 8. Backfill: Create attributions for existing AI-created entities
-- -----------------------------------------------------------------------------

-- Backfill bookings with session_id
INSERT INTO public.revenue_attributions (
  tenant_id, session_id, entity_type, entity_id, customer_id,
  revenue_cents, source_type, status, attributed_at
)
SELECT
  b.tenant_id,
  b.session_id,
  'booking',
  b.id,
  acs.customer_id,
  COALESCE(
    CASE WHEN s.price_type != 'quote_only' AND s.price_amount IS NOT NULL
         THEN (s.price_amount * 100)::integer
         ELSE NULL END,
    10000
  ),
  'ai_call',
  CASE
    WHEN b.status = 'completed' THEN 'completed'
    WHEN b.status IN ('canceled', 'no_show') THEN 'cancelled'
    ELSE 'pending'
  END,
  b.created_at
FROM bookings b
LEFT JOIN ai_call_sessions acs ON acs.id = b.session_id
LEFT JOIN services s ON s.id = b.service_id
WHERE b.session_id IS NOT NULL
ON CONFLICT (tenant_id, entity_type, entity_id) DO NOTHING;

-- Backfill dispatch_jobs with session_id
INSERT INTO public.revenue_attributions (
  tenant_id, session_id, entity_type, entity_id, customer_id,
  revenue_cents, source_type, status, attributed_at
)
SELECT
  d.tenant_id,
  d.session_id,
  'dispatch_job',
  d.id,
  d.customer_id,
  COALESCE(d.price_cents, 10000),
  'ai_call',
  CASE
    WHEN d.status = 'completed' THEN 'completed'
    WHEN d.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END,
  d.created_at
FROM dispatch_jobs d
WHERE d.session_id IS NOT NULL
ON CONFLICT (tenant_id, entity_type, entity_id) DO NOTHING;

-- Backfill food_orders with session_id
INSERT INTO public.revenue_attributions (
  tenant_id, session_id, entity_type, entity_id, customer_id,
  revenue_cents, source_type, status, attributed_at
)
SELECT
  f.tenant_id,
  f.session_id,
  'food_order',
  f.id,
  f.customer_id,
  COALESCE(f.total_cents, 10000),
  'ai_call',
  CASE
    WHEN f.status = 'completed' THEN 'completed'
    WHEN f.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END,
  f.created_at
FROM food_orders f
WHERE f.session_id IS NOT NULL
ON CONFLICT (tenant_id, entity_type, entity_id) DO NOTHING;

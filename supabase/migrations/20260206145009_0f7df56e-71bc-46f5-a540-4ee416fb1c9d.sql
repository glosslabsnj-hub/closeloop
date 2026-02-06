-- Fix the revenue attribution triggers to use the correct column name (revenue_cents, not amount_cents)

-- Drop the old triggers first
DROP TRIGGER IF EXISTS trg_attribution_booking ON bookings;
DROP TRIGGER IF EXISTS trg_attribution_dispatch_job ON dispatch_jobs;
DROP TRIGGER IF EXISTS trg_attribution_food_order ON food_orders;

-- Recreate the booking attribution function with correct column name
CREATE OR REPLACE FUNCTION fn_attribution_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    INSERT INTO revenue_attributions (
      tenant_id, entity_type, entity_id, session_id,
      revenue_cents, status, attributed_at
    ) VALUES (
      NEW.tenant_id, 'booking', NEW.id, NEW.session_id,
      NEW.price_cents, NEW.status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      revenue_cents = EXCLUDED.revenue_cents,
      status = EXCLUDED.status,
      attributed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the dispatch job attribution function with correct column name
CREATE OR REPLACE FUNCTION fn_attribution_on_dispatch_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    INSERT INTO revenue_attributions (
      tenant_id, entity_type, entity_id, session_id,
      revenue_cents, status, attributed_at
    ) VALUES (
      NEW.tenant_id, 'dispatch_job', NEW.id, NEW.session_id,
      NEW.price_cents, NEW.status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      revenue_cents = EXCLUDED.revenue_cents,
      status = EXCLUDED.status,
      attributed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the food order attribution function with correct column name
CREATE OR REPLACE FUNCTION fn_attribution_on_food_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    INSERT INTO revenue_attributions (
      tenant_id, entity_type, entity_id, session_id,
      revenue_cents, status, attributed_at
    ) VALUES (
      NEW.tenant_id, 'food_order', NEW.id, NEW.session_id,
      NEW.total_cents, NEW.status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      revenue_cents = EXCLUDED.revenue_cents,
      status = EXCLUDED.status,
      attributed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER trg_attribution_booking
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_attribution_on_booking();

CREATE TRIGGER trg_attribution_dispatch_job
  AFTER INSERT OR UPDATE ON dispatch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION fn_attribution_on_dispatch_job();

CREATE TRIGGER trg_attribution_food_order
  AFTER INSERT OR UPDATE ON food_orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_attribution_on_food_order();
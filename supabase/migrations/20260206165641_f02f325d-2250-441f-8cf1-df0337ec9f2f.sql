-- Fix revenue attribution triggers to handle NULL price_cents
-- The dispatch job trigger was failing because price_cents can be NULL at creation time

-- Recreate the dispatch job attribution function to handle NULL price_cents
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
      COALESCE(NEW.price_cents, 0), NEW.status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      revenue_cents = COALESCE(EXCLUDED.revenue_cents, revenue_attributions.revenue_cents, 0),
      status = EXCLUDED.status,
      attributed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Also fix the booking trigger to be safe
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
      COALESCE(NEW.price_cents, 0), NEW.status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      revenue_cents = COALESCE(EXCLUDED.revenue_cents, revenue_attributions.revenue_cents, 0),
      status = EXCLUDED.status,
      attributed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Also fix the food order trigger to be safe
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
      COALESCE(NEW.total_cents, 0), NEW.status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      revenue_cents = COALESCE(EXCLUDED.revenue_cents, revenue_attributions.revenue_cents, 0),
      status = EXCLUDED.status,
      attributed_at = now();
  END IF;
  RETURN NEW;
END;
$$;
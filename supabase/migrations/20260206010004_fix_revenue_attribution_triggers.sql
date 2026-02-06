-- P1 #6: Fix revenue attribution triggers - replace silent DO NOTHING
-- with proper conflict handling that logs instead of silently dropping.
--
-- The original triggers used ON CONFLICT DO NOTHING, which meant
-- duplicate attributions were silently swallowed. Now we update
-- the existing row on conflict so data stays current.

-- Fix booking attribution trigger
CREATE OR REPLACE FUNCTION public.fn_attribution_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only attribute if there's a session (AI-driven booking)
  IF NEW.session_id IS NOT NULL THEN
    INSERT INTO revenue_attributions (
      tenant_id, entity_type, entity_id, session_id,
      amount_cents, status, attributed_at
    ) VALUES (
      NEW.tenant_id, 'booking', NEW.id, NEW.session_id,
      NEW.price_cents, NEW.status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      amount_cents = EXCLUDED.amount_cents,
      status = EXCLUDED.status,
      attributed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix dispatch job attribution trigger
CREATE OR REPLACE FUNCTION public.fn_attribution_on_dispatch_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    INSERT INTO revenue_attributions (
      tenant_id, entity_type, entity_id, session_id,
      amount_cents, status, attributed_at
    ) VALUES (
      NEW.tenant_id, 'dispatch_job', NEW.id, NEW.session_id,
      NEW.price_cents, NEW.status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      amount_cents = EXCLUDED.amount_cents,
      status = EXCLUDED.status,
      attributed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix food order attribution trigger
CREATE OR REPLACE FUNCTION public.fn_attribution_on_food_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    INSERT INTO revenue_attributions (
      tenant_id, entity_type, entity_id, session_id,
      amount_cents, status, attributed_at
    ) VALUES (
      NEW.tenant_id, 'food_order', NEW.id, NEW.session_id,
      NEW.total_cents, NEW.status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      amount_cents = EXCLUDED.amount_cents,
      status = EXCLUDED.status,
      attributed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

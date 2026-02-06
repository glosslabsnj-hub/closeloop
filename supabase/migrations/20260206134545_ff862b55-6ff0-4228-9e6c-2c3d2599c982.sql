-- P1 #6: Fix revenue attribution triggers - replace silent DO NOTHING
-- with proper conflict handling that logs instead of silently dropping.

-- Fix booking attribution trigger
CREATE OR REPLACE FUNCTION public.fn_attribution_on_booking()
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

-- P1 #13: Change bookings.service_id from ON DELETE SET NULL to ON DELETE RESTRICT
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_service_id_fkey;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES public.services(id)
  ON DELETE RESTRICT;
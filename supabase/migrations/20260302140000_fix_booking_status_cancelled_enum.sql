-- Fix cancel booking: add 'cancelled' (British spelling) to booking_status enum
-- The enum was originally created with 'canceled' (American), but several code paths
-- use 'cancelled'. Adding both spellings prevents 22P02 errors.
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Fix revenue attribution trigger: the trigger from 20260206145009 passes NEW.status
-- directly from bookings to revenue_attributions.status, but revenue_attributions has
-- a CHECK constraint only allowing ('pending', 'completed', 'cancelled').
-- Booking statuses like 'confirmed', 'pending_deposit', 'no_show' would violate this.
-- Fix: map booking statuses to valid revenue_attribution statuses.
CREATE OR REPLACE FUNCTION fn_attribution_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mapped_status text;
BEGIN
  -- Map booking_status to revenue_attribution status
  CASE NEW.status::text
    WHEN 'completed' THEN mapped_status := 'completed';
    WHEN 'canceled' THEN mapped_status := 'cancelled';
    WHEN 'cancelled' THEN mapped_status := 'cancelled';
    WHEN 'no_show' THEN mapped_status := 'cancelled';
    ELSE mapped_status := 'pending';
  END CASE;

  IF NEW.session_id IS NOT NULL THEN
    INSERT INTO revenue_attributions (
      tenant_id, entity_type, entity_id, session_id,
      revenue_cents, status, attributed_at
    ) VALUES (
      NEW.tenant_id, 'booking', NEW.id, NEW.session_id,
      NEW.price_cents, mapped_status, now()
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

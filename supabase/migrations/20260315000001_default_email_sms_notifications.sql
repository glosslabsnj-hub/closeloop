-- Default all new tenants to email + SMS notifications (not just internal)
-- Why: Business owners expect to be notified when a booking comes in.
-- Internal-only means bookings silently appear in the dashboard with no alert.
-- Email and SMS should be on by default; owners can disable if they want.
-- Date: 2026-03-15

-- 1. Update the auto-create trigger to default to email + SMS
CREATE OR REPLACE FUNCTION public.fn_auto_create_delivery_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Universal delivery settings (callbacks, reservations, catering, intakes, job updates)
  INSERT INTO universal_delivery_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Booking delivery settings — email + SMS on by default
  INSERT INTO booking_delivery_settings (tenant_id, enabled, handoff_methods)
  VALUES (NEW.id, true, '["internal", "email", "sms"]'::jsonb)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Dispatch delivery settings — email + SMS on by default
  INSERT INTO dispatch_delivery_settings (tenant_id, enabled, handoff_methods)
  VALUES (NEW.id, true, '["internal", "email", "sms"]'::jsonb)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Backfill: add email + SMS to any existing tenants that only have ["internal"]
-- Only touches tenants that never changed from the original default.
-- If an owner deliberately removed email/sms, their handoff_methods won't be exactly ["internal"].
UPDATE booking_delivery_settings
SET handoff_methods = '["internal", "email", "sms"]'::jsonb
WHERE handoff_methods = '["internal"]'::jsonb;

UPDATE dispatch_delivery_settings
SET handoff_methods = '["internal", "email", "sms"]'::jsonb
WHERE handoff_methods = '["internal"]'::jsonb;

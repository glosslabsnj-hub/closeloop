-- Fix: Auto-create ALL delivery settings on tenant creation, not just 5 of 6
-- Also backfill callback, order, and medical_intake delivery settings for existing tenants
-- Note: callback_delivery_settings has different column names (sms_recipient_phone, email_recipient)
-- Note: medical_intake_delivery_settings has different column names (sms_recipient_phone, email_recipient)
-- Date: 2026-03-11

-- 1. Replace the trigger function to create ALL delivery settings
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

  -- Booking delivery settings (service/general mode)
  INSERT INTO booking_delivery_settings (tenant_id, enabled, handoff_methods)
  VALUES (NEW.id, true, '["internal"]'::jsonb)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Dispatch delivery settings (dispatch mode)
  INSERT INTO dispatch_delivery_settings (tenant_id, enabled, handoff_methods)
  VALUES (NEW.id, true, '["internal"]'::jsonb)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Callback delivery settings (sales mode - different schema: sms_recipient_phone, email_recipient)
  INSERT INTO callback_delivery_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Order delivery settings (food mode)
  INSERT INTO order_delivery_settings (tenant_id, enabled, handoff_methods)
  VALUES (NEW.id, true, '["internal"]'::jsonb)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Medical intake delivery settings (medical mode - different schema: sms_recipient_phone, email_recipient)
  INSERT INTO medical_intake_delivery_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Backfill callback_delivery_settings for ALL existing tenants
INSERT INTO callback_delivery_settings (tenant_id)
SELECT id FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM callback_delivery_settings)
ON CONFLICT (tenant_id) DO NOTHING;

-- 3. Backfill order_delivery_settings for ALL existing tenants
INSERT INTO order_delivery_settings (tenant_id, enabled, handoff_methods)
SELECT id, true, '["internal"]'::jsonb FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM order_delivery_settings)
ON CONFLICT (tenant_id) DO NOTHING;

-- 4. Backfill medical_intake_delivery_settings for ALL existing tenants
INSERT INTO medical_intake_delivery_settings (tenant_id)
SELECT id FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM medical_intake_delivery_settings)
ON CONFLICT (tenant_id) DO NOTHING;

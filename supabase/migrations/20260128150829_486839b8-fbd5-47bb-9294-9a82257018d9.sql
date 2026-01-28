-- P0-4: Index for faster ai_call_sessions lookup
CREATE INDEX IF NOT EXISTS idx_ai_call_sessions_twilio_call_sid 
ON ai_call_sessions(twilio_call_sid);

-- Index for handoff_attempts entity lookups
CREATE INDEX IF NOT EXISTS idx_handoff_attempts_entity 
ON handoff_attempts(entity_type, entity_id);

-- P1-3: Create medical_settings table for HIPAA configuration (if not exists)
-- This already exists in the schema from the types.ts file, so skip

-- Add function to hide webhook secrets from SELECT queries
-- Create a security view for delivery settings that excludes secrets
CREATE OR REPLACE VIEW public.booking_delivery_settings_safe AS
SELECT 
  tenant_id,
  enabled,
  handoff_methods,
  webhook_url,
  CASE WHEN webhook_secret IS NOT NULL THEN '********' ELSE NULL END as webhook_secret,
  notify_email,
  notify_phone,
  created_at,
  updated_at
FROM public.booking_delivery_settings;

CREATE OR REPLACE VIEW public.dispatch_delivery_settings_safe AS
SELECT 
  tenant_id,
  enabled,
  handoff_methods,
  webhook_url,
  CASE WHEN webhook_secret IS NOT NULL THEN '********' ELSE NULL END as webhook_secret,
  notify_email,
  notify_phone,
  urgent_sms_phone,
  created_at,
  updated_at
FROM public.dispatch_delivery_settings;

CREATE OR REPLACE VIEW public.order_delivery_settings_safe AS
SELECT 
  tenant_id,
  enabled,
  handoff_methods,
  webhook_url,
  CASE WHEN webhook_secret IS NOT NULL THEN '********' ELSE NULL END as webhook_secret,
  notify_email,
  notify_phone,
  print_format,
  auto_print,
  cancel_window_minutes,
  created_at,
  updated_at
FROM public.order_delivery_settings;
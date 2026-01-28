-- Fix SECURITY DEFINER views by recreating them explicitly as SECURITY INVOKER
-- Drop and recreate views with proper security

DROP VIEW IF EXISTS public.booking_delivery_settings_safe;
DROP VIEW IF EXISTS public.dispatch_delivery_settings_safe;
DROP VIEW IF EXISTS public.order_delivery_settings_safe;

-- Recreate views with explicit SECURITY INVOKER (inherits RLS from base table)
CREATE VIEW public.booking_delivery_settings_safe 
WITH (security_invoker = on) AS
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

CREATE VIEW public.dispatch_delivery_settings_safe 
WITH (security_invoker = on) AS
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

CREATE VIEW public.order_delivery_settings_safe 
WITH (security_invoker = on) AS
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
-- Add new SKU values to plan_code enum
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'sms-500';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'sms-1500';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'sms-3500';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'voice-200';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'voice-600';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'voice-1500';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'both-200-500';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'both-600-1500';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'both-1500-3500';

-- Add usage limit columns to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS included_minutes integer;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS included_sms_segments integer;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS overage_minute_rate_cents integer;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS overage_sms_rate_cents integer;

-- Create subscription_usage table for tracking monthly usage
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  billing_period_start timestamptz NOT NULL,
  billing_period_end timestamptz NOT NULL,
  voice_minutes_used integer DEFAULT 0,
  sms_segments_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT subscription_usage_tenant_period_unique UNIQUE(tenant_id, billing_period_start)
);

-- Enable RLS on subscription_usage
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_usage
CREATE POLICY "Users can view their tenant usage"
  ON public.subscription_usage
  FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Service role can manage usage"
  ON public.subscription_usage
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create tenant_locations table for multi-location support
CREATE TABLE IF NOT EXISTS public.tenant_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  phone_number_id uuid REFERENCES public.phone_numbers(id),
  is_primary boolean DEFAULT false,
  monthly_fee_cents integer NOT NULL,
  stripe_subscription_item_id text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on tenant_locations
ALTER TABLE public.tenant_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_locations
CREATE POLICY "Users can view their tenant locations"
  ON public.tenant_locations
  FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can manage their tenant locations"
  ON public.tenant_locations
  FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- Create or replace the initialize_assistant_settings function to handle new SKUs
CREATE OR REPLACE FUNCTION public.initialize_assistant_settings(_tenant_id uuid, _plan_code plan_code)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _voice_enabled boolean;
  _sms_enabled boolean;
  _voice_mode voice_mode;
  _missed_behavior missed_call_behavior;
BEGIN
  -- Determine feature flags based on SKU prefix
  _voice_enabled := _plan_code::text LIKE 'voice%' OR _plan_code::text LIKE 'both%';
  _sms_enabled := _plan_code::text LIKE 'sms%' OR _plan_code::text LIKE 'both%' OR _plan_code::text = 'text';
  
  -- Set voice mode
  _voice_mode := 'busy_mode'::voice_mode;
  
  -- Set missed call behavior based on features
  IF _voice_enabled AND _sms_enabled THEN
    _missed_behavior := 'both'::missed_call_behavior;
  ELSIF _voice_enabled THEN
    _missed_behavior := 'ai_callback'::missed_call_behavior;
  ELSE
    _missed_behavior := 'text_only'::missed_call_behavior;
  END IF;

  INSERT INTO assistant_settings (
    tenant_id,
    instant_text_enabled,
    voice_ai_enabled,
    voice_mode,
    missed_call_behavior
  ) VALUES (
    _tenant_id,
    _sms_enabled,
    _voice_enabled,
    _voice_mode,
    _missed_behavior
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    instant_text_enabled = EXCLUDED.instant_text_enabled,
    voice_ai_enabled = EXCLUDED.voice_ai_enabled,
    voice_mode = EXCLUDED.voice_mode,
    missed_call_behavior = EXCLUDED.missed_call_behavior,
    updated_at = now();
END;
$function$;

-- Create trigger for updated_at on subscription_usage
CREATE OR REPLACE TRIGGER update_subscription_usage_updated_at
  BEFORE UPDATE ON public.subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on tenant_locations
CREATE OR REPLACE TRIGGER update_tenant_locations_updated_at
  BEFORE UPDATE ON public.tenant_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled');

-- Create plan code enum
CREATE TYPE public.plan_code AS ENUM ('text', 'voice', 'both');

-- Create voice mode enum
CREATE TYPE public.voice_mode AS ENUM ('always_on', 'busy_mode', 'overflow', 'after_hours_only');

-- Create missed call behavior enum
CREATE TYPE public.missed_call_behavior AS ENUM ('text_only', 'ai_callback', 'both');

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_code public.plan_code NOT NULL,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Create assistant_settings table
CREATE TABLE IF NOT EXISTS public.assistant_settings (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE PRIMARY KEY,
  instant_text_enabled BOOLEAN NOT NULL DEFAULT false,
  voice_ai_enabled BOOLEAN NOT NULL DEFAULT false,
  voice_mode public.voice_mode NOT NULL DEFAULT 'busy_mode',
  busy_toggle BOOLEAN NOT NULL DEFAULT false,
  overflow_rings INTEGER NOT NULL DEFAULT 3,
  missed_call_behavior public.missed_call_behavior NOT NULL DEFAULT 'text_only',
  sms_first_delay_seconds INTEGER NOT NULL DEFAULT 30,
  ai_callback_delay_minutes INTEGER,
  business_phone_number TEXT,
  closeloop_number TEXT,
  phone_connected BOOLEAN NOT NULL DEFAULT false,
  go_live_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
DROP POLICY IF EXISTS "Users can view their tenant subscription" ON public.subscriptions;
CREATE POLICY "Users can view their tenant subscription"
  ON public.subscriptions FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert their tenant subscription" ON public.subscriptions;
CREATE POLICY "Users can insert their tenant subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update their tenant subscription" ON public.subscriptions;
CREATE POLICY "Users can update their tenant subscription"
  ON public.subscriptions FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- Enable RLS on assistant_settings
ALTER TABLE public.assistant_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for assistant_settings
DROP POLICY IF EXISTS "Users can view their tenant assistant settings" ON public.assistant_settings;
CREATE POLICY "Users can view their tenant assistant settings"
  ON public.assistant_settings FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert their tenant assistant settings" ON public.assistant_settings;
CREATE POLICY "Users can insert their tenant assistant settings"
  ON public.assistant_settings FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update their tenant assistant settings" ON public.assistant_settings;
CREATE POLICY "Users can update their tenant assistant settings"
  ON public.assistant_settings FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- Function to initialize assistant settings based on plan
CREATE OR REPLACE FUNCTION public.initialize_assistant_settings(_tenant_id UUID, _plan_code public.plan_code)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO assistant_settings (
    tenant_id,
    instant_text_enabled,
    voice_ai_enabled,
    voice_mode,
    missed_call_behavior
  ) VALUES (
    _tenant_id,
    _plan_code IN ('text', 'both'),
    _plan_code IN ('voice', 'both'),
    CASE WHEN _plan_code IN ('voice', 'both') THEN 'busy_mode'::voice_mode ELSE 'busy_mode'::voice_mode END,
    CASE 
      WHEN _plan_code = 'text' THEN 'text_only'::missed_call_behavior
      WHEN _plan_code = 'voice' THEN 'ai_callback'::missed_call_behavior
      ELSE 'both'::missed_call_behavior
    END
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    instant_text_enabled = EXCLUDED.instant_text_enabled,
    voice_ai_enabled = EXCLUDED.voice_ai_enabled,
    voice_mode = EXCLUDED.voice_mode,
    missed_call_behavior = EXCLUDED.missed_call_behavior,
    updated_at = now();
END;
$$;

-- Function to check if tenant has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_tenant_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE tenant_id = _tenant_id
    AND status IN ('active', 'trialing')
  )
$$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assistant_settings_updated_at ON public.assistant_settings;
CREATE TRIGGER update_assistant_settings_updated_at
  BEFORE UPDATE ON public.assistant_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
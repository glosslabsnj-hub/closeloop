-- Create phone_numbers table for tracking provisioned Twilio numbers
CREATE TABLE public.phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL UNIQUE,
  twilio_sid TEXT UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'forwarding',
  status TEXT NOT NULL DEFAULT 'provisioned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for tenant lookup
CREATE INDEX idx_phone_numbers_tenant_id ON public.phone_numbers(tenant_id);

-- Create index for phone lookup (used by inbound webhook)
CREATE INDEX idx_phone_numbers_phone_e164 ON public.phone_numbers(phone_e164);

-- Enable RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- Users can view their tenant's phone numbers
CREATE POLICY "Users can view their tenant phone numbers"
  ON public.phone_numbers FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

-- Only service role can insert/update (edge functions)
CREATE POLICY "Service role can manage phone numbers"
  ON public.phone_numbers FOR ALL
  USING (auth.role() = 'service_role');

-- Extend assistant_settings with additional fields for voice routing
ALTER TABLE public.assistant_settings
  ADD COLUMN IF NOT EXISTS forwarding_phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS connect_status TEXT DEFAULT 'not_connected';

-- Create ai_call_sessions table if not exists for call tracking
-- (it exists but let's ensure the schema is correct)
-- Add twilio_call_sid for correlation
ALTER TABLE public.ai_call_sessions
  ADD COLUMN IF NOT EXISTS twilio_call_sid TEXT,
  ADD COLUMN IF NOT EXISTS caller_phone TEXT,
  ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id TEXT;
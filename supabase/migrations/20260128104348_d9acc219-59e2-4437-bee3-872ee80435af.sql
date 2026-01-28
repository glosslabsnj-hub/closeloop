-- Add Twilio tracking columns to assistant_settings
ALTER TABLE public.assistant_settings 
ADD COLUMN IF NOT EXISTS twilio_phone_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_provisioned_at TIMESTAMPTZ;
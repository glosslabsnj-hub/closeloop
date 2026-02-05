-- Add IVR routing mode for dispatch businesses
-- This controls how inbound calls are routed: towing only, impound only, or IVR menu

-- Add dispatch_ivr_mode to assistant_settings
ALTER TABLE public.assistant_settings
ADD COLUMN IF NOT EXISTS dispatch_ivr_mode text DEFAULT 'towing_only'
CHECK (dispatch_ivr_mode IN ('towing_only', 'impound_only', 'ivr_routing'));

-- Add comment explaining the column
COMMENT ON COLUMN public.assistant_settings.dispatch_ivr_mode IS 
'Controls inbound call routing for dispatch businesses: towing_only (default), impound_only, or ivr_routing (press 1/2 menu)';

-- Add impound agent configuration to ai_assistants or create separate config
-- For now, we'll add impound-specific fields to assistant_settings
ALTER TABLE public.assistant_settings
ADD COLUMN IF NOT EXISTS impound_agent_id text,
ADD COLUMN IF NOT EXISTS impound_greeting_script text,
ADD COLUMN IF NOT EXISTS impound_fallback_script text;
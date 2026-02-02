-- Add agent OFF behavior settings to assistant_settings table
-- This enables safe agent toggle with deterministic call routing

-- Add off_behavior enum type
DO $$ BEGIN
  CREATE TYPE public.off_behavior AS ENUM (
    'FORWARD_OWNER',
    'VOICEMAIL',
    'CALLBACK_ONLY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to assistant_settings
ALTER TABLE public.assistant_settings
ADD COLUMN IF NOT EXISTS off_behavior public.off_behavior DEFAULT 'FORWARD_OWNER',
ADD COLUMN IF NOT EXISTS owner_forward_number TEXT,
ADD COLUMN IF NOT EXISTS owner_forward_verified BOOLEAN NOT NULL DEFAULT false;

-- Comment explaining the fields
COMMENT ON COLUMN public.assistant_settings.off_behavior IS 'What happens when agent is toggled OFF: FORWARD_OWNER (forward to business owner), VOICEMAIL (take voicemail), CALLBACK_ONLY (capture callback request)';
COMMENT ON COLUMN public.assistant_settings.owner_forward_number IS 'E.164 phone number to forward calls to when agent is OFF and off_behavior = FORWARD_OWNER. Must be verified before use.';
COMMENT ON COLUMN public.assistant_settings.owner_forward_verified IS 'Whether owner_forward_number has been verified (stub for now - can implement verification flow later)';

-- Add check constraint to ensure off_behavior is valid
ALTER TABLE public.assistant_settings
ADD CONSTRAINT valid_off_behavior CHECK (off_behavior IN ('FORWARD_OWNER', 'VOICEMAIL', 'CALLBACK_ONLY'));

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_assistant_settings_off_behavior
ON public.assistant_settings(off_behavior)
WHERE voice_ai_enabled = false;

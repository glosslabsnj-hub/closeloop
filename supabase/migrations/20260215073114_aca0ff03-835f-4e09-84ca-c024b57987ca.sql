
-- Add toll-free SMS fallback columns to a2p_registrations
ALTER TABLE public.a2p_registrations
  ADD COLUMN IF NOT EXISTS toll_free_phone_e164 text,
  ADD COLUMN IF NOT EXISTS toll_free_phone_sid text,
  ADD COLUMN IF NOT EXISTS toll_free_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS toll_free_messaging_service_sid text,
  ADD COLUMN IF NOT EXISTS toll_free_verification_sid text;

-- Add unknown_question_behavior enum and column to assistant_settings
-- Used by onboarding Step 4 (Communication Preferences) to configure
-- how the AI handles questions it cannot answer confidently.

CREATE TYPE public.unknown_question_behavior AS ENUM (
  'escalate',
  'try_help',
  'offer_callback'
);

ALTER TABLE public.assistant_settings
  ADD COLUMN IF NOT EXISTS unknown_question_behavior public.unknown_question_behavior DEFAULT 'try_help';

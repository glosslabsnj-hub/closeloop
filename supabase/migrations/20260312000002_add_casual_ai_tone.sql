-- Add 'casual' to ai_tone enum (was missing, causing food mode onboarding failures)
ALTER TYPE public.ai_tone ADD VALUE IF NOT EXISTS 'casual';

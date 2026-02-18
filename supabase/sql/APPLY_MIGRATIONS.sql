-- Run this SQL in your Supabase SQL Editor to apply the new features
-- This adds support for:
-- 1. Agent OFF behavior (forward/voicemail/callback)
-- 2. Busyness slider (if not already exists)

-- ===== PART 1: Busyness Rules (if not exists) =====
-- Check if busyness_rules_jsonb already exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenants'
        AND column_name = 'busyness_rules_jsonb'
    ) THEN
        ALTER TABLE public.tenants
        ADD COLUMN busyness_rules_jsonb JSONB DEFAULT '{"base_prep_minutes": 30, "busy_buffer_minutes": 15, "manual_busyness_pct": 30}'::jsonb;

        COMMENT ON COLUMN public.tenants.busyness_rules_jsonb IS 'Busyness/ETA rules: { "base_prep_minutes": number, "busy_buffer_minutes": number, "manual_busyness_pct": number (0-100) }';
    END IF;
END $$;

-- ===== PART 2: Agent OFF Behavior =====
-- Create off_behavior enum type
DO $$ BEGIN
  CREATE TYPE public.off_behavior AS ENUM (
    'FORWARD_OWNER',
    'VOICEMAIL',
    'CALLBACK_ONLY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to assistant_settings (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assistant_settings'
        AND column_name = 'off_behavior'
    ) THEN
        ALTER TABLE public.assistant_settings
        ADD COLUMN off_behavior public.off_behavior DEFAULT 'FORWARD_OWNER';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assistant_settings'
        AND column_name = 'owner_forward_number'
    ) THEN
        ALTER TABLE public.assistant_settings
        ADD COLUMN owner_forward_number TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assistant_settings'
        AND column_name = 'owner_forward_verified'
    ) THEN
        ALTER TABLE public.assistant_settings
        ADD COLUMN owner_forward_verified BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.assistant_settings.off_behavior IS 'What happens when agent is toggled OFF: FORWARD_OWNER (forward to business owner), VOICEMAIL (take voicemail), CALLBACK_ONLY (capture callback request)';
COMMENT ON COLUMN public.assistant_settings.owner_forward_number IS 'E.164 phone number to forward calls to when agent is OFF and off_behavior = FORWARD_OWNER. Must be verified before use.';
COMMENT ON COLUMN public.assistant_settings.owner_forward_verified IS 'Whether owner_forward_number has been verified (stub for now - can implement verification flow later)';

-- Add check constraint (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_off_behavior'
        AND table_name = 'assistant_settings'
    ) THEN
        ALTER TABLE public.assistant_settings
        ADD CONSTRAINT valid_off_behavior CHECK (off_behavior IN ('FORWARD_OWNER', 'VOICEMAIL', 'CALLBACK_ONLY'));
    END IF;
END $$;

-- Add index for common queries (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_assistant_settings_off_behavior'
    ) THEN
        CREATE INDEX idx_assistant_settings_off_behavior
        ON public.assistant_settings(off_behavior)
        WHERE voice_ai_enabled = false;
    END IF;
END $$;

-- ===== DONE =====
-- Verify the changes
SELECT 'Migrations applied successfully!' as status;

-- Check busyness_rules_jsonb exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenants' AND column_name = 'busyness_rules_jsonb'
        ) THEN 'busyness_rules_jsonb: ✓ EXISTS'
        ELSE 'busyness_rules_jsonb: ✗ MISSING'
    END as busyness_check;

-- Check off_behavior columns exist
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'assistant_settings' AND column_name = 'off_behavior'
        ) THEN 'off_behavior columns: ✓ EXISTS'
        ELSE 'off_behavior columns: ✗ MISSING'
    END as off_behavior_check;

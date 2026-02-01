-- =====================================================
-- COMPREHENSIVE DATABASE FIX FOR BUSINESS BRAIN & DASHBOARD
-- =====================================================
-- This SQL fixes all missing columns causing "failed to load" errors
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- =====================================================

-- ===== PART 1: Add pricing_rules_jsonb =====
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenants'
        AND column_name = 'pricing_rules_jsonb'
    ) THEN
        ALTER TABLE public.tenants
        ADD COLUMN pricing_rules_jsonb JSONB DEFAULT '{"rules": []}'::jsonb;

        COMMENT ON COLUMN public.tenants.pricing_rules_jsonb IS 'Pricing rules configuration: { "rules": [{ "type": "flat|per-unit|tiered|distance-based|range-only|quote-only", "service_id": "uuid", "required_inputs": ["vehicle_type", "miles"], "config": {...} }] }';

        RAISE NOTICE 'Added pricing_rules_jsonb column';
    ELSE
        RAISE NOTICE 'pricing_rules_jsonb already exists';
    END IF;
END $$;

-- ===== PART 2: Add busyness_rules_jsonb =====
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

        RAISE NOTICE 'Added busyness_rules_jsonb column';
    ELSE
        RAISE NOTICE 'busyness_rules_jsonb already exists';
    END IF;
END $$;

-- ===== PART 3: Add ai_policies_json =====
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenants'
        AND column_name = 'ai_policies_json'
    ) THEN
        ALTER TABLE public.tenants
        ADD COLUMN ai_policies_json JSONB DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN public.tenants.ai_policies_json IS 'AI business policies for upselling, pricing negotiation, capacity management, recognition, and escalation';

        RAISE NOTICE 'Added ai_policies_json column';
    ELSE
        RAISE NOTICE 'ai_policies_json already exists';
    END IF;
END $$;

-- ===== PART 4: Agent OFF Behavior (from previous migration) =====
-- Create off_behavior enum type
DO $$ BEGIN
  CREATE TYPE public.off_behavior AS ENUM (
    'FORWARD_OWNER',
    'VOICEMAIL',
    'CALLBACK_ONLY'
  );
  RAISE NOTICE 'Created off_behavior enum type';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'off_behavior enum already exists';
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

        RAISE NOTICE 'Added off_behavior column';
    ELSE
        RAISE NOTICE 'off_behavior already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assistant_settings'
        AND column_name = 'owner_forward_number'
    ) THEN
        ALTER TABLE public.assistant_settings
        ADD COLUMN owner_forward_number TEXT;

        RAISE NOTICE 'Added owner_forward_number column';
    ELSE
        RAISE NOTICE 'owner_forward_number already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assistant_settings'
        AND column_name = 'owner_forward_verified'
    ) THEN
        ALTER TABLE public.assistant_settings
        ADD COLUMN owner_forward_verified BOOLEAN NOT NULL DEFAULT false;

        RAISE NOTICE 'Added owner_forward_verified column';
    ELSE
        RAISE NOTICE 'owner_forward_verified already exists';
    END IF;
END $$;

-- Add comments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assistant_settings' AND column_name = 'off_behavior') THEN
        COMMENT ON COLUMN public.assistant_settings.off_behavior IS 'What happens when agent is toggled OFF: FORWARD_OWNER (forward to business owner), VOICEMAIL (take voicemail), CALLBACK_ONLY (capture callback request)';
        COMMENT ON COLUMN public.assistant_settings.owner_forward_number IS 'E.164 phone number to forward calls to when agent is OFF and off_behavior = FORWARD_OWNER. Must be verified before use.';
        COMMENT ON COLUMN public.assistant_settings.owner_forward_verified IS 'Whether owner_forward_number has been verified (stub for now - can implement verification flow later)';
    END IF;
END $$;

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

        RAISE NOTICE 'Added valid_off_behavior constraint';
    ELSE
        RAISE NOTICE 'valid_off_behavior constraint already exists';
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

        RAISE NOTICE 'Added idx_assistant_settings_off_behavior index';
    ELSE
        RAISE NOTICE 'idx_assistant_settings_off_behavior index already exists';
    END IF;
END $$;

-- ===== VERIFICATION =====
-- Check all columns exist
SELECT 'All migrations completed!' as status;

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenants' AND column_name = 'pricing_rules_jsonb'
        ) THEN '✓ pricing_rules_jsonb EXISTS'
        ELSE '✗ pricing_rules_jsonb MISSING'
    END as check_1;

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenants' AND column_name = 'busyness_rules_jsonb'
        ) THEN '✓ busyness_rules_jsonb EXISTS'
        ELSE '✗ busyness_rules_jsonb MISSING'
    END as check_2;

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenants' AND column_name = 'ai_policies_json'
        ) THEN '✓ ai_policies_json EXISTS'
        ELSE '✗ ai_policies_json MISSING'
    END as check_3;

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'assistant_settings' AND column_name = 'off_behavior'
        ) THEN '✓ off_behavior columns EXIST'
        ELSE '✗ off_behavior columns MISSING'
    END as check_4;

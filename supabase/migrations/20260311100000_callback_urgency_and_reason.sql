-- Phase 3: Add urgency detection + reason to callback_requests
-- Enables dashboard alerts with priority highlighting and status tracking
-- Date: 2026-03-11

-- 1. Add urgency column (normal, high, urgent)
ALTER TABLE public.callback_requests
  ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'normal'
  CHECK (urgency IN ('normal', 'high', 'urgent'));

-- 2. Add reason column (the AI's captured reason for the callback)
ALTER TABLE public.callback_requests
  ADD COLUMN IF NOT EXISTS reason TEXT;

-- 3. Add contact_attempts column (how many times owner tried calling back)
ALTER TABLE public.callback_requests
  ADD COLUMN IF NOT EXISTS contact_attempts INTEGER NOT NULL DEFAULT 0;

-- 4. Add last_contacted_at column
ALTER TABLE public.callback_requests
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- 5. Index for dashboard queries: pending/high-urgency first
CREATE INDEX IF NOT EXISTS idx_callback_requests_urgency
  ON public.callback_requests (tenant_id, status, urgency, created_at DESC);

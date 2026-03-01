-- Multi-Staff Calendar Foundation (B1)
--
-- Fixes the busy_blocks_no_overlap exclusion constraint to include staff_id,
-- allowing different staff members to have concurrent bookings.
-- Adds staff_id to calendar_connections and calendar_tokens.
-- All changes are backward-compatible: NULL staff_id behavior is unchanged.

-- ============================================================
-- 1. Fix busy_blocks_no_overlap exclusion constraint
-- ============================================================
-- Current constraint: (tenant_id, tstzrange) — blocks entire tenant from concurrent bookings
-- New constraint: (tenant_id, COALESCE(staff_id, sentinel), tstzrange)
-- Sentinel UUID ensures NULL staff_ids still conflict with each other (solo mode unchanged)
-- but different staff_ids can have overlapping time ranges.

-- Drop the existing constraint
ALTER TABLE public.busy_blocks
  DROP CONSTRAINT IF EXISTS busy_blocks_no_overlap;

-- Re-create with staff_id awareness
-- Using a fixed sentinel UUID for NULL staff_ids so they still participate in the exclusion
ALTER TABLE public.busy_blocks
  ADD CONSTRAINT busy_blocks_no_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    COALESCE(staff_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (block_type IN ('hold', 'confirmed_booking') AND is_active = TRUE);

-- ============================================================
-- 2. Add staff_id to calendar_connections
-- ============================================================
ALTER TABLE public.calendar_connections
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_connections_staff
  ON public.calendar_connections(staff_id)
  WHERE staff_id IS NOT NULL;

-- ============================================================
-- 3. Fix calendar_tokens UNIQUE constraint for per-staff tokens
-- ============================================================
-- Current: UNIQUE(tenant_id, provider) — one token per provider per tenant
-- New: partial unique indexes allowing per-staff tokens

-- Drop the existing unique constraint
ALTER TABLE public.calendar_tokens
  DROP CONSTRAINT IF EXISTS calendar_tokens_tenant_id_provider_key;

-- Add staff_id column
ALTER TABLE public.calendar_tokens
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- Partial unique index for tenant-level tokens (staff_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_tokens_tenant_provider
  ON public.calendar_tokens(tenant_id, provider)
  WHERE staff_id IS NULL;

-- Partial unique index for staff-level tokens (staff_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_tokens_staff_provider
  ON public.calendar_tokens(tenant_id, provider, staff_id)
  WHERE staff_id IS NOT NULL;

-- ============================================================
-- 4. Add leads table columns for temperature scoring (A2/A3)
-- ============================================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS temperature TEXT,
  ADD COLUMN IF NOT EXISTS temperature_score INTEGER,
  ADD COLUMN IF NOT EXISTS temperature_signals TEXT[],
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS last_session_id UUID REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS estimated_value_cents INTEGER;

CREATE INDEX IF NOT EXISTS idx_leads_temperature
  ON public.leads(tenant_id, temperature)
  WHERE temperature IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage
  ON public.leads(tenant_id, pipeline_stage);

-- ============================================================
-- 5. Composite indexes for staff-aware scheduling
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_busy_blocks_tenant_staff_time
  ON public.busy_blocks(tenant_id, staff_id, start_at, end_at)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_staff_time
  ON public.bookings(tenant_id, staff_id, start_at)
  WHERE staff_id IS NOT NULL;

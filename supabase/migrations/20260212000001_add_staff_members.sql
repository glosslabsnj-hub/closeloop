-- Phase 3: Multi-Resource Availability & Scheduling
-- Creates staff_members table and adds staff_id to bookings + busy_blocks

-- ─── Staff Members Table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  hours_json JSONB, -- NULL = uses business hours; same format as tenants.hours_json
  service_ids UUID[], -- which services they can perform; NULL = all services
  calendar_connection_id UUID REFERENCES public.calendar_connections(id) ON DELETE SET NULL,
  color TEXT, -- hex color for UI calendar display
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast tenant-based lookups
CREATE INDEX IF NOT EXISTS idx_staff_members_tenant
  ON public.staff_members(tenant_id) WHERE is_active = true;

-- ─── Add staff_id to bookings ────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Add staff_id to busy_blocks ─────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'busy_blocks' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE public.busy_blocks ADD COLUMN staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for staff-filtered booking lookups
CREATE INDEX IF NOT EXISTS idx_bookings_staff
  ON public.bookings(staff_id) WHERE staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_busy_blocks_staff
  ON public.busy_blocks(staff_id) WHERE staff_id IS NOT NULL;

-- ─── RLS Policies ────────────────────────────────────────────────────────────

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- Tenant members can read staff
DROP POLICY IF EXISTS "staff_members_select" ON public.staff_members;
CREATE POLICY "staff_members_select"
  ON public.staff_members
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

-- Tenant owners/managers can insert staff
DROP POLICY IF EXISTS "staff_members_insert" ON public.staff_members;
CREATE POLICY "staff_members_insert"
  ON public.staff_members
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tenant owners/managers can update staff
DROP POLICY IF EXISTS "staff_members_update" ON public.staff_members;
CREATE POLICY "staff_members_update"
  ON public.staff_members
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tenant owners can delete staff
DROP POLICY IF EXISTS "staff_members_delete" ON public.staff_members;
CREATE POLICY "staff_members_delete"
  ON public.staff_members
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ─── Updated Trigger ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_staff_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_members_updated_at ON public.staff_members;
CREATE TRIGGER trg_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.update_staff_members_updated_at();

-- ============================================================================
-- Active Jobs / Work-In-Progress Tracker
-- Tables: active_jobs, job_service_items, job_status_updates
-- ============================================================================

-- ─── 1. active_jobs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.active_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  location_id uuid DEFAULT NULL,
  job_number text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'intake'
    CHECK (status IN ('intake','in_progress','on_hold','completed','picked_up','cancelled')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal','rush','urgent')),
  notes text,
  customer_name text,
  customer_phone text,  -- E.164 format
  metadata_json jsonb DEFAULT '{}'::jsonb,
  estimated_completion timestamptz,
  actual_completion timestamptz,
  intake_method text NOT NULL DEFAULT 'manual'
    CHECK (intake_method IN ('manual','ai_call','csv_import','api')),
  source_session_id uuid REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL,
  notify_on_step_complete boolean NOT NULL DEFAULT false,
  notify_on_all_complete boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_active_jobs_tenant_job_number UNIQUE (tenant_id, job_number)
);

COMMENT ON TABLE public.active_jobs IS 'Work-in-progress tracker for customer jobs (vehicles in shop, devices in repair, etc.)';

-- ─── 2. job_service_items ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.active_jobs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','skipped')),
  sort_order integer NOT NULL DEFAULT 0,
  assigned_to text,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.job_service_items IS 'Individual service steps within an active job';

-- ─── 3. job_status_updates ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.active_jobs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  message text,
  triggered_notification boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.job_status_updates IS 'Audit log of job status transitions';

-- ─── 4. Indexes ─────────────────────────────────────────────────────────────

CREATE INDEX idx_active_jobs_tenant ON public.active_jobs (tenant_id);
CREATE INDEX idx_active_jobs_customer_phone ON public.active_jobs (tenant_id, customer_phone) WHERE is_active = true;
CREATE INDEX idx_active_jobs_status ON public.active_jobs (tenant_id, status) WHERE is_active = true;
CREATE INDEX idx_job_items_job ON public.job_service_items (job_id);
CREATE INDEX idx_job_status_updates_job ON public.job_status_updates (job_id);

-- ─── 5. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.active_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_updates ENABLE ROW LEVEL SECURITY;

-- active_jobs
CREATE POLICY "active_jobs_tenant_access" ON public.active_jobs
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

-- job_service_items
CREATE POLICY "job_service_items_tenant_access" ON public.job_service_items
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

-- job_status_updates
CREATE POLICY "job_status_updates_tenant_access" ON public.job_status_updates
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

-- ─── 6. updated_at trigger ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_active_jobs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_active_jobs_updated_at
  BEFORE UPDATE ON public.active_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_active_jobs_updated_at();

-- ─── 7. Status change audit trigger ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.job_status_updates (job_id, tenant_id, previous_status, new_status, created_by)
    VALUES (NEW.id, NEW.tenant_id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_job_status_change
  AFTER UPDATE ON public.active_jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_job_status_change();

-- ─── 8. Job number generator ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_job_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  next_num integer;
  result text;
BEGIN
  SELECT COALESCE(MAX(
    CASE
      WHEN job_number ~ '^JOB-\d+$'
      THEN CAST(substring(job_number FROM 5) AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM public.active_jobs
  WHERE tenant_id = p_tenant_id;

  result := 'JOB-' || lpad(next_num::text, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 9. Enable Realtime ─────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_service_items;

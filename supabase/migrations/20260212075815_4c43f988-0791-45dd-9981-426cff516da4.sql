
-- ============================================
-- 1. customer_vehicles table
-- ============================================
CREATE TABLE public.customer_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  year SMALLINT,
  make TEXT,
  model TEXT,
  color TEXT,
  vin TEXT,
  license_plate TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique VIN per tenant (when VIN is provided)
CREATE UNIQUE INDEX idx_customer_vehicles_vin_tenant ON public.customer_vehicles (tenant_id, vin) WHERE vin IS NOT NULL;

ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view vehicles" ON public.customer_vehicles
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can insert vehicles" ON public.customer_vehicles
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can update vehicles" ON public.customer_vehicles
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can delete vehicles" ON public.customer_vehicles
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- updated_at trigger
CREATE TRIGGER update_customer_vehicles_updated_at
  BEFORE UPDATE ON public.customer_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. active_jobs table
-- ============================================
CREATE TABLE public.active_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID REFERENCES public.customers(id),
  vehicle_id UUID REFERENCES public.customer_vehicles(id),
  location_id UUID,
  job_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  priority TEXT NOT NULL DEFAULT 'normal',
  notes TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  estimated_completion TIMESTAMPTZ,
  actual_completion TIMESTAMPTZ,
  intake_method TEXT NOT NULL DEFAULT 'manual',
  source_session_id UUID,
  notify_on_step_complete BOOLEAN NOT NULL DEFAULT false,
  notify_on_all_complete BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_active_jobs_number_tenant ON public.active_jobs (tenant_id, job_number);

ALTER TABLE public.active_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view jobs" ON public.active_jobs
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can insert jobs" ON public.active_jobs
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can update jobs" ON public.active_jobs
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can delete jobs" ON public.active_jobs
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE TRIGGER update_active_jobs_updated_at
  BEFORE UPDATE ON public.active_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_jobs;

-- ============================================
-- 3. job_service_items table
-- ============================================
CREATE TABLE public.job_service_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.active_jobs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  service_id UUID,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INT NOT NULL DEFAULT 0,
  assigned_to UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_service_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view job items" ON public.job_service_items
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can insert job items" ON public.job_service_items
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can update job items" ON public.job_service_items
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can delete job items" ON public.job_service_items
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.job_service_items;

-- ============================================
-- 4. generate_job_number function
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_job_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN job_number ~ '^JOB-\d+$'
         THEN CAST(SUBSTRING(job_number FROM 5) AS INT)
         ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM public.active_jobs
  WHERE tenant_id = p_tenant_id;

  RETURN 'JOB-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;

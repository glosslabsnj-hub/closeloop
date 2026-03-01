
CREATE TABLE IF NOT EXISTS public.test_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID REFERENCES public.customers(id),
  vehicle_id UUID,
  vehicle_description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 30,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  salesperson TEXT,
  notes TEXT,
  booking_id UUID,
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant users can view test drives" ON public.test_drives;
CREATE POLICY "Tenant users can view test drives"
  ON public.test_drives FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant users can insert test drives" ON public.test_drives;
CREATE POLICY "Tenant users can insert test drives"
  ON public.test_drives FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant users can update test drives" ON public.test_drives;
CREATE POLICY "Tenant users can update test drives"
  ON public.test_drives FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant users can delete test drives" ON public.test_drives;
CREATE POLICY "Tenant users can delete test drives"
  ON public.test_drives FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access to test drives" ON public.test_drives;
CREATE POLICY "Service role full access to test drives"
  ON public.test_drives FOR ALL
  USING (auth.role() = 'service_role');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'test_drives') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.test_drives;
  END IF;
END $$;

DELETE FROM public.calendar_connections 
  WHERE tenant_id = '59debf18-1276-4c10-ae1b-6194a531540c' 
  AND status = 'error';

-- Dispatch driver roster system
-- Allows dispatch-mode tenants to manage crew/driver rosters and assign from them

CREATE TABLE IF NOT EXISTS dispatch_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  vehicle_info text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'offline', 'break')),
  current_job_id uuid REFERENCES dispatch_jobs(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_drivers_tenant ON dispatch_drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_drivers_status ON dispatch_drivers(tenant_id, status);

-- Enable RLS
ALTER TABLE dispatch_drivers ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other tenant-scoped tables)
CREATE POLICY "Users can view own tenant drivers" ON dispatch_drivers
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own tenant drivers" ON dispatch_drivers
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

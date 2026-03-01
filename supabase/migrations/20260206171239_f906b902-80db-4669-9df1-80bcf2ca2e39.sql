-- Add driver role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'driver';

-- Fleet drivers table - crew members who can be assigned jobs
CREATE TABLE IF NOT EXISTS public.fleet_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone_e164 TEXT,
  email TEXT,
  license_number TEXT,
  license_expiry DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_break')),
  default_vehicle_id UUID,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fleet vehicles table - vehicles that can be dispatched
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vehicle_type TEXT,
  license_plate TEXT,
  vin TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  capacity_notes TEXT,
  photo_url TEXT,
  current_driver_id UUID REFERENCES public.fleet_drivers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from drivers to vehicles (after vehicles table exists)
ALTER TABLE public.fleet_drivers 
ADD CONSTRAINT fleet_drivers_default_vehicle_fkey 
FOREIGN KEY (default_vehicle_id) REFERENCES public.fleet_vehicles(id) ON DELETE SET NULL;

-- Update dispatch_jobs for proper linking to fleet entities
ALTER TABLE public.dispatch_jobs 
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.fleet_drivers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.fleet_vehicles(id) ON DELETE SET NULL;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_tenant ON public.fleet_drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_status ON public.fleet_drivers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_user ON public.fleet_drivers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_tenant ON public.fleet_vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_status ON public.fleet_vehicles(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_driver ON public.dispatch_jobs(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_vehicle ON public.dispatch_jobs(vehicle_id) WHERE vehicle_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.fleet_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fleet_drivers

-- Tenant users (owner/staff) can view all drivers in their tenant
DROP POLICY IF EXISTS "Tenant users can view fleet_drivers" ON public.fleet_drivers;
CREATE POLICY "Tenant users can view fleet_drivers"
  ON public.fleet_drivers
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

-- Tenant users (owner/staff) can insert drivers
DROP POLICY IF EXISTS "Tenant users can insert fleet_drivers" ON public.fleet_drivers;
CREATE POLICY "Tenant users can insert fleet_drivers"
  ON public.fleet_drivers
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- Tenant users (owner/staff) can update drivers
DROP POLICY IF EXISTS "Tenant users can update fleet_drivers" ON public.fleet_drivers;
CREATE POLICY "Tenant users can update fleet_drivers"
  ON public.fleet_drivers
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- Tenant users (owner/staff) can delete drivers
DROP POLICY IF EXISTS "Tenant users can delete fleet_drivers" ON public.fleet_drivers;
CREATE POLICY "Tenant users can delete fleet_drivers"
  ON public.fleet_drivers
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- Drivers can view their own record
DROP POLICY IF EXISTS "Drivers can view own record" ON public.fleet_drivers;
CREATE POLICY "Drivers can view own record"
  ON public.fleet_drivers
  FOR SELECT USING (user_id = auth.uid());

-- Drivers can update their own record (limited fields via app logic)
DROP POLICY IF EXISTS "Drivers can update own record" ON public.fleet_drivers;
CREATE POLICY "Drivers can update own record"
  ON public.fleet_drivers
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for fleet_vehicles

-- Tenant users can view all vehicles in their tenant
DROP POLICY IF EXISTS "Tenant users can view fleet_vehicles" ON public.fleet_vehicles;
CREATE POLICY "Tenant users can view fleet_vehicles"
  ON public.fleet_vehicles
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

-- Tenant users (owner/staff) can insert vehicles
DROP POLICY IF EXISTS "Tenant users can insert fleet_vehicles" ON public.fleet_vehicles;
CREATE POLICY "Tenant users can insert fleet_vehicles"
  ON public.fleet_vehicles
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- Tenant users (owner/staff) can update vehicles
DROP POLICY IF EXISTS "Tenant users can update fleet_vehicles" ON public.fleet_vehicles;
CREATE POLICY "Tenant users can update fleet_vehicles"
  ON public.fleet_vehicles
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- Tenant users (owner/staff) can delete vehicles
DROP POLICY IF EXISTS "Tenant users can delete fleet_vehicles" ON public.fleet_vehicles;
CREATE POLICY "Tenant users can delete fleet_vehicles"
  ON public.fleet_vehicles
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- Drivers can view vehicles in their tenant (for selection)
DROP POLICY IF EXISTS "Drivers can view tenant vehicles" ON public.fleet_vehicles;
CREATE POLICY "Drivers can view tenant vehicles"
  ON public.fleet_vehicles
  FOR SELECT USING (
    tenant_id IN (
      SELECT fd.tenant_id FROM public.fleet_drivers fd WHERE fd.user_id = auth.uid()
    )
  );

-- Drivers can update vehicle's current_driver_id (to claim/release vehicle)
DROP POLICY IF EXISTS "Drivers can update vehicle assignment" ON public.fleet_vehicles;
CREATE POLICY "Drivers can update vehicle assignment"
  ON public.fleet_vehicles
  FOR UPDATE USING (
    tenant_id IN (
      SELECT fd.tenant_id FROM public.fleet_drivers fd WHERE fd.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_fleet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fleet_drivers_updated_at ON public.fleet_drivers;
CREATE TRIGGER trg_fleet_drivers_updated_at
  BEFORE UPDATE ON public.fleet_drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_fleet_updated_at();

DROP TRIGGER IF EXISTS trg_fleet_vehicles_updated_at ON public.fleet_vehicles;
CREATE TRIGGER trg_fleet_vehicles_updated_at
  BEFORE UPDATE ON public.fleet_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_fleet_updated_at();
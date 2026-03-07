-- Fix fleet_drivers and fleet_vehicles RLS to include 'manager' role.
-- The original policies only allowed 'owner' and 'staff' for INSERT/UPDATE/DELETE.
-- Users with 'manager' role (created via agency provisioning or manual admin)
-- were blocked from managing fleet records.

-- fleet_drivers INSERT
DROP POLICY IF EXISTS "Tenant users can insert fleet_drivers" ON public.fleet_drivers;
CREATE POLICY "Tenant users can insert fleet_drivers"
  ON public.fleet_drivers
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

-- fleet_drivers UPDATE
DROP POLICY IF EXISTS "Tenant users can update fleet_drivers" ON public.fleet_drivers;
CREATE POLICY "Tenant users can update fleet_drivers"
  ON public.fleet_drivers
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

-- fleet_drivers DELETE
DROP POLICY IF EXISTS "Tenant users can delete fleet_drivers" ON public.fleet_drivers;
CREATE POLICY "Tenant users can delete fleet_drivers"
  ON public.fleet_drivers
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

-- fleet_vehicles INSERT
DROP POLICY IF EXISTS "Tenant users can insert fleet_vehicles" ON public.fleet_vehicles;
CREATE POLICY "Tenant users can insert fleet_vehicles"
  ON public.fleet_vehicles
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

-- fleet_vehicles UPDATE
DROP POLICY IF EXISTS "Tenant users can update fleet_vehicles" ON public.fleet_vehicles;
CREATE POLICY "Tenant users can update fleet_vehicles"
  ON public.fleet_vehicles
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

-- fleet_vehicles DELETE
DROP POLICY IF EXISTS "Tenant users can delete fleet_vehicles" ON public.fleet_vehicles;
CREATE POLICY "Tenant users can delete fleet_vehicles"
  ON public.fleet_vehicles
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

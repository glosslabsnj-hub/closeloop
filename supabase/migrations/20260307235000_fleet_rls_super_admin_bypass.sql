-- Fix fleet_drivers and fleet_vehicles write RLS to include super_admin bypass.
-- Root cause: INSERT/UPDATE/DELETE policies only checked tenant_users role (owner/manager/staff).
-- Super_admin users testing via admin mode switching are NOT in tenant_users as owner/manager/staff,
-- so writes fail with 403. The has_tenant_access() function already has super_admin bypass for SELECT.
-- SELECT returns empty set (not 403) for non-members, so page "loads" but writes fail.

-- fleet_drivers INSERT
DROP POLICY IF EXISTS "Tenant users can insert fleet_drivers" ON public.fleet_drivers;
CREATE POLICY "Tenant users can insert fleet_drivers"
  ON public.fleet_drivers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    OR
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
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    OR
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
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    OR
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
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    OR
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
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    OR
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
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    OR
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

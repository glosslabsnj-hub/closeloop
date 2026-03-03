-- Fix competitive-features tables RLS: add super_admin bypass + clean up duplicate policies
-- Root cause: Previous migration added WITH CHECK but didn't include has_tenant_access() / super_admin check.
-- Super admins testing HVAC tenant got 403 because they have no tenant_users row for that tenant.

-- Helper: reusable access check expression
-- has_tenant_access(auth.uid(), tenant_id) already checks both tenant_users AND user_roles.super_admin

-- ============================================================
-- 1. ESTIMATES
-- ============================================================
DROP POLICY IF EXISTS "Tenants can manage own estimates" ON estimates;
CREATE POLICY "Tenants can manage own estimates"
  ON estimates FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

-- Keep service_role bypass (already exists, ensure idempotent)
DROP POLICY IF EXISTS "Service role full access estimates" ON estimates;
CREATE POLICY "Service role full access estimates"
  ON estimates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. SERVICE_AGREEMENTS
-- ============================================================
DROP POLICY IF EXISTS "Tenants can manage own agreements" ON service_agreements;
DROP POLICY IF EXISTS "Tenants can manage own service_agreements" ON service_agreements;
CREATE POLICY "Tenants can manage own service_agreements"
  ON service_agreements FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Service role full access service_agreements" ON service_agreements;
CREATE POLICY "Service role full access service_agreements"
  ON service_agreements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. TIME_ENTRIES
-- ============================================================
DROP POLICY IF EXISTS "Tenants can manage own time entries" ON time_entries;
DROP POLICY IF EXISTS "Tenants can manage own time_entries" ON time_entries;
CREATE POLICY "Tenants can manage own time_entries"
  ON time_entries FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Service role full access time_entries" ON time_entries;
CREATE POLICY "Service role full access time_entries"
  ON time_entries FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 4. TECHNICIAN_LOCATIONS
-- ============================================================
DROP POLICY IF EXISTS "Tenants can view own technician locations" ON technician_locations;
DROP POLICY IF EXISTS "Tenants can manage own technician_locations" ON technician_locations;
CREATE POLICY "Tenants can manage own technician_locations"
  ON technician_locations FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Service role full access technician_locations" ON technician_locations;
CREATE POLICY "Service role full access technician_locations"
  ON technician_locations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 5. CUSTOMER_EQUIPMENT
-- ============================================================
DROP POLICY IF EXISTS "Tenants can manage own customer equipment" ON customer_equipment;
DROP POLICY IF EXISTS "Tenants can manage own customer_equipment" ON customer_equipment;
CREATE POLICY "Tenants can manage own customer_equipment"
  ON customer_equipment FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Service role full access customer_equipment" ON customer_equipment;
CREATE POLICY "Service role full access customer_equipment"
  ON customer_equipment FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 6. INTEGRATION_CONNECTIONS
-- ============================================================
DROP POLICY IF EXISTS "Tenants can manage own integrations" ON integration_connections;
DROP POLICY IF EXISTS "Tenants can manage own integration_connections" ON integration_connections;
CREATE POLICY "Tenants can manage own integration_connections"
  ON integration_connections FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Service role full access integration_connections" ON integration_connections;
CREATE POLICY "Service role full access integration_connections"
  ON integration_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 7. REVIEW_REQUESTS
-- ============================================================
DROP POLICY IF EXISTS "Tenants can manage own review requests" ON review_requests;
DROP POLICY IF EXISTS "Tenants can manage own review_requests" ON review_requests;
CREATE POLICY "Tenants can manage own review_requests"
  ON review_requests FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Service role full access review_requests" ON review_requests;
CREATE POLICY "Service role full access review_requests"
  ON review_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

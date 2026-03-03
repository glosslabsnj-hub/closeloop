-- Fix 1: Expand followup_status validation trigger to include 'contacted' and 'quoted'
-- These are legitimate pipeline stages used by the lead management UI.
-- Previously only: new, called_back, no_answer, completed, lost
CREATE OR REPLACE FUNCTION public.validate_followup_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.followup_status IS NOT NULL AND NEW.followup_status NOT IN (
    'new', 'called_back', 'no_answer', 'completed', 'lost', 'contacted', 'quoted'
  ) THEN
    RAISE EXCEPTION 'Invalid followup_status: %. Must be new, called_back, no_answer, completed, lost, contacted, or quoted', NEW.followup_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 2: Add WITH CHECK to estimates table RLS (was missing, blocked INSERT/UPDATE)
DROP POLICY IF EXISTS "Tenants can manage own estimates" ON estimates;
CREATE POLICY "Tenants can manage own estimates"
  ON estimates
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Also add service_role bypass for estimates
DROP POLICY IF EXISTS "Service role full access estimates" ON estimates;
CREATE POLICY "Service role full access estimates"
  ON estimates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix 3: Add WITH CHECK to service_agreements table RLS
DROP POLICY IF EXISTS "Tenants can manage own service_agreements" ON service_agreements;
CREATE POLICY "Tenants can manage own service_agreements"
  ON service_agreements
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access service_agreements" ON service_agreements;
CREATE POLICY "Service role full access service_agreements"
  ON service_agreements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix 4: Add WITH CHECK to time_entries table RLS
DROP POLICY IF EXISTS "Tenants can manage own time_entries" ON time_entries;
CREATE POLICY "Tenants can manage own time_entries"
  ON time_entries
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access time_entries" ON time_entries;
CREATE POLICY "Service role full access time_entries"
  ON time_entries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix 5: Add WITH CHECK to technician_locations table RLS
DROP POLICY IF EXISTS "Tenants can manage own technician_locations" ON technician_locations;
CREATE POLICY "Tenants can manage own technician_locations"
  ON technician_locations
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access technician_locations" ON technician_locations;
CREATE POLICY "Service role full access technician_locations"
  ON technician_locations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix 6: Add WITH CHECK to customer_equipment table RLS
DROP POLICY IF EXISTS "Tenants can manage own customer_equipment" ON customer_equipment;
CREATE POLICY "Tenants can manage own customer_equipment"
  ON customer_equipment
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access customer_equipment" ON customer_equipment;
CREATE POLICY "Service role full access customer_equipment"
  ON customer_equipment FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix 7: Add WITH CHECK to integration_connections table RLS
DROP POLICY IF EXISTS "Tenants can manage own integration_connections" ON integration_connections;
CREATE POLICY "Tenants can manage own integration_connections"
  ON integration_connections
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access integration_connections" ON integration_connections;
CREATE POLICY "Service role full access integration_connections"
  ON integration_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix 8: Add WITH CHECK to review_requests table RLS
DROP POLICY IF EXISTS "Tenants can manage own review_requests" ON review_requests;
CREATE POLICY "Tenants can manage own review_requests"
  ON review_requests
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access review_requests" ON review_requests;
CREATE POLICY "Service role full access review_requests"
  ON review_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix 9: Ensure ai_call_sessions has WITH CHECK for UPDATE operations
-- The existing policy uses has_tenant_access() which is correct, just needs WITH CHECK
DROP POLICY IF EXISTS "Users can manage tenant AI call sessions" ON ai_call_sessions;
CREATE POLICY "Users can manage tenant AI call sessions"
  ON ai_call_sessions FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

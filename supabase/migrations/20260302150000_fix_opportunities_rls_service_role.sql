-- Fix opportunities table RLS: add service_role bypass policy
-- The test call simulator and edge functions (elevenlabs-create-callback, universal-delivery)
-- need service_role access to INSERT/SELECT/UPDATE opportunities.
-- Without this, the CallSimulator fails with "new row violates row-level security policy".

-- Service role bypass (edge functions use service_role key)
DROP POLICY IF EXISTS "Service role can manage opportunities" ON public.opportunities;
CREATE POLICY "Service role can manage opportunities"
  ON public.opportunities FOR ALL
  USING (auth.role() = 'service_role');

-- Ensure the existing user policy has a proper WITH CHECK clause for INSERTs
-- The FOR ALL policy needs WITH CHECK to allow inserts (USING alone only covers reads)
DROP POLICY IF EXISTS "Users can manage tenant opportunities" ON public.opportunities;
CREATE POLICY "Users can manage tenant opportunities"
  ON public.opportunities FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

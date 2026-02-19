-- TIER 1 Security Fix: RLS policies for ai_event_logs and eta_routes_cache
-- Issue: Both tables have overly permissive "FOR ALL USING (true)" policies
-- that allow any authenticated user (or even anon) to read/write all rows.

-- ============================================================
-- 1.1  ai_event_logs — drop the permissive catch-all policy
-- ============================================================
-- The original "Service role can manage event logs" was dropped in a prior
-- migration (20260129183209), but recreate the DROP just in case it was
-- re-applied or another environment still has it.
DROP POLICY IF EXISTS "Service role can manage event logs" ON public.ai_event_logs;

-- Restrict read access to tenant members (service_role bypasses RLS automatically).
-- The existing SELECT policy "Tenant users can view their event logs" already
-- uses has_tenant_access, so it stays.  We add an explicit INSERT policy for
-- edge-function writes that come through with an authenticated JWT (rare but safe).
CREATE POLICY "Tenant users can insert their event logs"
ON public.ai_event_logs
FOR INSERT
WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- ============================================================
-- 1.2  eta_routes_cache — same fix
-- ============================================================
DROP POLICY IF EXISTS "Service role can manage route cache" ON public.eta_routes_cache;

-- Tenant-scoped INSERT for authenticated users
CREATE POLICY "Tenant users can insert their route cache"
ON public.eta_routes_cache
FOR INSERT
WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- Tenant-scoped UPDATE (e.g., refresh an expired entry)
CREATE POLICY "Tenant users can update their route cache"
ON public.eta_routes_cache
FOR UPDATE
USING (public.has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- Tenant-scoped DELETE
CREATE POLICY "Tenant users can delete their route cache"
ON public.eta_routes_cache
FOR DELETE
USING (public.has_tenant_access(auth.uid(), tenant_id));

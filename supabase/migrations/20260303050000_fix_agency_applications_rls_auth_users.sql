-- Fix: agency_applications SELECT policy references auth.users directly,
-- which the authenticated role cannot access. This causes "permission denied
-- for table users" (HTTP 401) on every page load because useMyAgencyApplication()
-- runs globally from AppLayout.
--
-- Fix: Replace (SELECT email FROM auth.users WHERE id = auth.uid())
-- with auth.jwt() ->> 'email' which reads from the JWT claims directly.

DROP POLICY IF EXISTS "admin_select_agency_applications" ON agency_applications;
CREATE POLICY "admin_select_agency_applications"
  ON agency_applications FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin')
    OR email = (auth.jwt() ->> 'email')
  );

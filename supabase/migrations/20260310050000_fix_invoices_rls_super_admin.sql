-- Fix: invoices RLS policy missing super_admin bypass
-- Admins could see bookings but not invoices because bookings RLS includes
-- super_admin check but invoices RLS did not.

DROP POLICY IF EXISTS "Tenants can manage their own invoices" ON invoices;

CREATE POLICY "Tenants can manage their own invoices"
  ON invoices FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
  );

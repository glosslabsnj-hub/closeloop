-- Fix notification_preferences RLS policy: add WITH CHECK for INSERT/UPDATE
-- The existing policy only has USING (for SELECT/DELETE) but not WITH CHECK,
-- which causes Postgres to deny all writes (upsert fails on toggle).

-- Drop the broken policy
DROP POLICY IF EXISTS "Users can manage own notification preferences" ON notification_preferences;

-- Recreate with proper WITH CHECK clause for INSERT/UPDATE support
CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (
    user_id = auth.uid()
    AND tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- Also add super_admin bypass so admins can manage any tenant's preferences
CREATE POLICY "Super admins can manage all notification preferences"
  ON notification_preferences FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

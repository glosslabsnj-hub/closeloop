CREATE TABLE IF NOT EXISTS feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  user_email text,
  category text NOT NULL,
  subcategory text,
  description text NOT NULL,
  page_url text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Tenants can insert their own feedback
CREATE POLICY "Tenants can insert own feedback"
  ON feedback FOR INSERT
  WITH CHECK (tenant_id = (
    SELECT tu.tenant_id FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
    LIMIT 1
  ));

-- Tenants can view their own feedback
CREATE POLICY "Tenants can select own feedback"
  ON feedback FOR SELECT
  USING (tenant_id = (
    SELECT tu.tenant_id FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
    LIMIT 1
  ));

-- Super admins can view all feedback
CREATE POLICY "Super admins can select all feedback"
  ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
  );

-- Super admins can update feedback status
CREATE POLICY "Super admins can update all feedback"
  ON feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
  );

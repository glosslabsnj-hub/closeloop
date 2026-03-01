-- Admin Dashboard Overhaul: 4 new tables for lead finder, reseller finder, marketing

-- 1. admin_saved_leads — business leads saved by super_admin
CREATE TABLE IF NOT EXISTS admin_saved_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  website text,
  address text,
  industry text,
  rating numeric,
  review_count integer,
  employee_estimate text,
  hours text,
  reason text,
  friction_signals text[] DEFAULT '{}',
  confidence text,
  score integer,
  temperature text,
  score_reasons text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, address)
);

ALTER TABLE admin_saved_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_saved_leads_user_access" ON admin_saved_leads;
CREATE POLICY "admin_saved_leads_user_access"
  ON admin_saved_leads
  FOR ALL USING (user_id = auth.uid());

-- 2. admin_reseller_leads — reseller/agency partner leads saved by super_admin
CREATE TABLE IF NOT EXISTS admin_reseller_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  website text,
  address text,
  company_type text,
  services_offered text[] DEFAULT '{}',
  partnership_signals text[] DEFAULT '{}',
  client_base_size text,
  rating numeric,
  review_count integer,
  employee_estimate text,
  reason text,
  confidence text,
  score integer,
  temperature text,
  score_reasons text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, address)
);

ALTER TABLE admin_reseller_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_reseller_leads_user_access" ON admin_reseller_leads;
CREATE POLICY "admin_reseller_leads_user_access"
  ON admin_reseller_leads
  FOR ALL USING (user_id = auth.uid());

-- 3. admin_marketing_chats — AI marketing chat history
CREATE TABLE IF NOT EXISTS admin_marketing_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_marketing_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_marketing_chats_user_access" ON admin_marketing_chats;
CREATE POLICY "admin_marketing_chats_user_access"
  ON admin_marketing_chats
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_admin_marketing_chats_session ON admin_marketing_chats(session_id, created_at);

-- 4. admin_marketing_content — saved AI marketing outputs
CREATE TABLE IF NOT EXISTS admin_marketing_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_marketing_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_marketing_content_user_access" ON admin_marketing_content;
CREATE POLICY "admin_marketing_content_user_access"
  ON admin_marketing_content
  FOR ALL USING (user_id = auth.uid());

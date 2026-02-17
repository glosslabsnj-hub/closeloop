CREATE TABLE IF NOT EXISTS agency_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text NOT NULL,
  company_website text,
  expected_clients integer NOT NULL DEFAULT 0,
  current_client_count integer DEFAULT 0,
  services_offered text[] DEFAULT '{}',
  referral_source text,
  message text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewing','approved','rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  approved_agency_id uuid REFERENCES agency_accounts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agency_applications_status ON agency_applications(status);
CREATE INDEX idx_agency_applications_email ON agency_applications(email);

ALTER TABLE agency_applications ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — insert via service role (public form), read via admin

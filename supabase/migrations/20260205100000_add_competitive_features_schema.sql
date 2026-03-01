-- CloseLoop Competitive Features Schema
-- Phase 1-3: Estimates, Agreements, Time Tracking, GPS, Equipment, Integrations
-- This migration adds tables to match FieldEdge, Jobber, ServiceTitan capabilities

-- =====================================================
-- 1. ESTIMATES / PROPOSALS
-- Professional quotes with line items, e-signature, PDF
-- =====================================================
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES dispatch_jobs(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Identification
  estimate_number TEXT NOT NULL,
  title TEXT,

  -- Status workflow: draft → sent → viewed → accepted/declined/expired
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted')),

  -- Line items (JSON array of {name, description, quantity, unit_price_cents, total_cents})
  line_items JSONB NOT NULL DEFAULT '[]',

  -- Good-Better-Best options (JSON array of option groups)
  -- Each option: {name: "Basic", line_items: [...], total_cents: 500}
  pricing_options JSONB DEFAULT NULL,
  selected_option TEXT DEFAULT NULL, -- Which option customer selected

  -- Totals
  subtotal_cents INTEGER,
  tax_rate_percent DECIMAL(5, 3) DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  total_cents INTEGER,

  -- Validity
  valid_until DATE,

  -- Customer acceptance
  signature_data TEXT, -- Base64 signature image or typed name
  signature_ip TEXT,
  signed_at TIMESTAMPTZ,
  accepted_terms BOOLEAN DEFAULT FALSE,

  -- Documents
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Notes
  internal_notes TEXT, -- Not shown to customer
  customer_notes TEXT, -- Shown on estimate
  terms_and_conditions TEXT,

  -- Tracking
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  converted_to_job_id UUID REFERENCES dispatch_jobs(id),
  converted_to_booking_id UUID REFERENCES bookings(id),

  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for estimates
CREATE INDEX IF NOT EXISTS idx_estimates_tenant ON estimates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_estimates_number ON estimates(tenant_id, estimate_number);

-- RLS for estimates
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can manage own estimates" ON estimates;
CREATE POLICY "Tenants can manage own estimates"
  ON estimates
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 2. SERVICE AGREEMENTS / MEMBERSHIPS
-- Recurring maintenance plans with auto-renewal
-- =====================================================
CREATE TABLE IF NOT EXISTS service_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Identification
  agreement_number TEXT NOT NULL,

  -- Plan details
  plan_name TEXT NOT NULL,
  plan_type TEXT DEFAULT 'standard'
    CHECK (plan_type IN ('basic', 'standard', 'premium', 'custom')),
  description TEXT,

  -- Pricing
  price_cents INTEGER NOT NULL,
  billing_frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'one_time')),

  -- Duration
  start_date DATE NOT NULL,
  end_date DATE,
  renewal_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'pending_renewal', 'suspended')),

  -- Benefits
  services_included JSONB DEFAULT '[]', -- Array of {service_id, service_name, visits_per_year}
  discount_percent INTEGER DEFAULT 0, -- Discount on additional services
  priority_scheduling BOOLEAN DEFAULT FALSE,
  waived_trip_charge BOOLEAN DEFAULT FALSE,

  -- Billing
  stripe_subscription_id TEXT,
  last_billed_at TIMESTAMPTZ,
  next_billing_date DATE,

  -- Renewal tracking
  renewal_reminder_sent_at TIMESTAMPTZ,
  renewed_from_agreement_id UUID REFERENCES service_agreements(id),

  -- Notes
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for service_agreements
CREATE INDEX IF NOT EXISTS idx_agreements_tenant ON service_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agreements_customer ON service_agreements(customer_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON service_agreements(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_agreements_renewal ON service_agreements(renewal_date)
  WHERE status = 'active' AND auto_renew = TRUE;

-- RLS for service_agreements
ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can manage own agreements" ON service_agreements;
CREATE POLICY "Tenants can manage own agreements"
  ON service_agreements
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 3. TIME ENTRIES
-- Clock in/out, job time tracking for payroll
-- =====================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Link to work
  job_id UUID REFERENCES dispatch_jobs(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Time tracking
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  duration_minutes INTEGER, -- Computed on clock_out or manually set

  -- Entry type
  entry_type TEXT NOT NULL DEFAULT 'work'
    CHECK (entry_type IN ('work', 'travel', 'break', 'admin', 'training')),

  -- Location (for GPS verification)
  clock_in_lat DECIMAL(10, 8),
  clock_in_lng DECIMAL(11, 8),
  clock_out_lat DECIMAL(10, 8),
  clock_out_lng DECIMAL(11, 8),

  -- Billing
  billable BOOLEAN DEFAULT TRUE,
  hourly_rate_cents INTEGER, -- Override rate for this entry

  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'exported')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Payroll export tracking
  payroll_exported_at TIMESTAMPTZ,
  payroll_batch_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for time_entries
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(tenant_id, clock_in);
CREATE INDEX IF NOT EXISTS idx_time_entries_pending ON time_entries(tenant_id, status)
  WHERE status = 'pending';

-- RLS for time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can manage own time entries" ON time_entries;
CREATE POLICY "Tenants can manage own time entries"
  ON time_entries
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 4. TECHNICIAN LOCATIONS
-- Real-time GPS tracking for dispatch optimization
-- =====================================================
CREATE TABLE IF NOT EXISTS technician_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Current assignment
  job_id UUID REFERENCES dispatch_jobs(id) ON DELETE SET NULL,

  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters DECIMAL(8, 2),
  heading DECIMAL(5, 2), -- Direction in degrees
  speed_mph DECIMAL(6, 2),

  -- Status
  status TEXT DEFAULT 'available'
    CHECK (status IN ('available', 'en_route', 'on_site', 'on_break', 'offline')),

  -- Battery/connectivity (for mobile app)
  battery_percent INTEGER,
  is_charging BOOLEAN,

  -- Timestamp
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for technician_locations
CREATE INDEX IF NOT EXISTS idx_tech_locations_tenant ON technician_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tech_locations_user ON technician_locations(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tech_locations_recent ON technician_locations(tenant_id, recorded_at DESC);

-- Keep only recent locations (cleanup policy)
-- Locations older than 7 days can be archived/deleted

-- RLS for technician_locations
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can view own technician locations" ON technician_locations;
CREATE POLICY "Tenants can view own technician locations"
  ON technician_locations
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 5. CUSTOMER EQUIPMENT
-- Track installed equipment for service businesses
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Equipment details
  equipment_type TEXT NOT NULL, -- hvac, furnace, water_heater, ac_unit, etc.
  brand TEXT,
  model TEXT,
  serial_number TEXT,

  -- Installation
  install_date DATE,
  installed_by TEXT, -- Could be competitor or CloseLoop tenant
  location_in_home TEXT, -- "Basement", "Attic", "Garage", etc.

  -- Warranty
  warranty_expiry DATE,
  warranty_provider TEXT,
  warranty_notes TEXT,

  -- Condition
  condition TEXT DEFAULT 'good'
    CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_replacement')),
  last_service_date DATE,
  next_service_due DATE,

  -- Photos
  photos JSONB DEFAULT '[]', -- Array of photo URLs

  -- Specifications
  specifications JSONB DEFAULT '{}', -- Model-specific specs (BTU, tonnage, etc.)

  -- Notes
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'replaced', 'removed', 'unknown')),
  replaced_by_equipment_id UUID REFERENCES customer_equipment(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for customer_equipment
CREATE INDEX IF NOT EXISTS idx_equipment_tenant ON customer_equipment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_customer ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_equipment_warranty ON customer_equipment(warranty_expiry)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_equipment_service_due ON customer_equipment(next_service_due)
  WHERE status = 'active';

-- RLS for customer_equipment
ALTER TABLE customer_equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can manage own customer equipment" ON customer_equipment;
CREATE POLICY "Tenants can manage own customer equipment"
  ON customer_equipment
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 6. INTEGRATION CONNECTIONS
-- OAuth tokens and sync status for third-party integrations
-- =====================================================
CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Integration type
  integration_type TEXT NOT NULL, -- quickbooks, xero, servicetitan, wisetack, etc.

  -- Connection status
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'error', 'expired', 'pending')),

  -- OAuth tokens (encrypted)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Connection metadata
  external_account_id TEXT, -- ID in the external system
  external_account_name TEXT, -- Display name from external system
  scopes TEXT[], -- Granted OAuth scopes

  -- Sync settings
  settings JSONB DEFAULT '{}', -- Integration-specific settings
  sync_frequency TEXT DEFAULT 'realtime'
    CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'manual')),
  sync_direction TEXT DEFAULT 'bidirectional'
    CHECK (sync_direction IN ('import', 'export', 'bidirectional')),

  -- Sync status
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_items_count INTEGER,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  consecutive_errors INTEGER DEFAULT 0,

  -- Webhook (for real-time sync)
  webhook_secret TEXT,
  webhook_url TEXT,

  -- Metadata
  connected_by UUID,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint per tenant/integration
  UNIQUE(tenant_id, integration_type)
);

-- Indexes for integration_connections
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integration_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integration_connections(integration_type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integration_connections(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_integrations_expiry ON integration_connections(token_expires_at)
  WHERE status = 'connected';

-- RLS for integration_connections
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can manage own integrations" ON integration_connections;
CREATE POLICY "Tenants can manage own integrations"
  ON integration_connections
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 7. REVIEW REQUESTS
-- Track review request automation
-- =====================================================
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Source
  job_id UUID REFERENCES dispatch_jobs(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  order_id UUID REFERENCES food_orders(id) ON DELETE SET NULL,

  -- Request details
  sent_via TEXT NOT NULL CHECK (sent_via IN ('sms', 'email')),
  sent_to TEXT NOT NULL, -- Phone or email
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Links included
  google_review_url TEXT,
  yelp_review_url TEXT,
  facebook_review_url TEXT,
  custom_review_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'opened', 'clicked', 'reviewed', 'declined')),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  clicked_platform TEXT, -- Which platform they clicked

  -- Response (if we can track it)
  review_received BOOLEAN DEFAULT FALSE,
  review_rating INTEGER CHECK (review_rating >= 1 AND review_rating <= 5),
  review_platform TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for review_requests
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON review_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON review_requests(tenant_id, status);

-- RLS for review_requests
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can manage own review requests" ON review_requests;
CREATE POLICY "Tenants can manage own review requests"
  ON review_requests
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE estimates IS 'Professional estimates/proposals with Good-Better-Best pricing and e-signature';
COMMENT ON TABLE service_agreements IS 'Recurring maintenance plans and service agreements';
COMMENT ON TABLE time_entries IS 'Employee time tracking for payroll and job costing';
COMMENT ON TABLE technician_locations IS 'Real-time GPS locations for dispatch optimization';
COMMENT ON TABLE customer_equipment IS 'Installed equipment tracking for service businesses';
COMMENT ON TABLE integration_connections IS 'OAuth connections to third-party tools (QuickBooks, etc.)';
COMMENT ON TABLE review_requests IS 'Automated review request tracking';

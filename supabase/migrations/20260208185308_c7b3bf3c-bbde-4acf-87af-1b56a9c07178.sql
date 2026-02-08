-- Add capabilities_json column to tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS capabilities_json JSONB DEFAULT '{}';

-- Create capability_definitions table
CREATE TABLE IF NOT EXISTS public.capability_definitions (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  default_enabled_for_modes TEXT[],
  conflicts_with TEXT[],
  requires TEXT[],
  icon_name TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.capability_definitions ENABLE ROW LEVEL SECURITY;

-- Create read policy
CREATE POLICY "capability_definitions_select" ON public.capability_definitions
  FOR SELECT TO authenticated USING (true);

-- Insert capability definitions
INSERT INTO public.capability_definitions (id, display_name, description, category, default_enabled_for_modes, icon_name, sort_order) VALUES
('ai_voice', 'AI Phone Answering', 'AI answers calls on your behalf', 'core', ARRAY['service','dispatch','food','medical','general'], 'Phone', 1),
('instant_text_back', 'Instant Text Response', 'Auto-text when calls are missed', 'core', ARRAY['service','dispatch','food','medical','general'], 'MessageSquare', 2),
('booking', 'Appointment Scheduling', 'Book appointments with calendar sync', 'scheduling', ARRAY['service','medical'], 'Calendar', 10),
('calendar_sync', 'Calendar Integration', 'Sync with Google/Outlook calendars', 'scheduling', ARRAY['service','medical'], 'CalendarSync', 11),
('walk_ins', 'Walk-In Management', 'Handle walk-in customers', 'scheduling', ARRAY['service'], 'DoorOpen', 12),
('same_day_appointments', 'Same-Day Booking', 'Allow same-day appointment requests', 'scheduling', NULL, 'Clock', 13),
('dispatch_queue', 'Dispatch Queue', 'Manage on-demand job assignments', 'dispatch', ARRAY['dispatch'], 'Truck', 20),
('emergency_dispatch', 'Emergency/Same-Day Jobs', 'Handle urgent same-day requests', 'dispatch', ARRAY['dispatch'], 'Siren', 21),
('scheduled_dispatch', 'Scheduled Jobs', 'Pre-schedule dispatch jobs in advance', 'dispatch', NULL, 'CalendarClock', 22),
('fleet_management', 'Fleet & Drivers', 'Track vehicles and crew members', 'dispatch', NULL, 'Users', 23),
('impound_lot', 'Impound Lot', 'Manage vehicle storage and releases', 'dispatch', NULL, 'Warehouse', 24),
('motor_club', 'Motor Club Integration', 'AAA and roadside club pricing', 'dispatch', NULL, 'Award', 25),
('distance_pricing', 'Distance-Based Pricing', 'Calculate prices by mileage', 'dispatch', ARRAY['dispatch'], 'MapPin', 26),
('mobile_service', 'Mobile/On-Site Service', 'Travel to customer locations', 'dispatch', ARRAY['dispatch'], 'Car', 27),
('food_orders', 'Food Orders', 'Take pickup and delivery orders', 'food', ARRAY['food'], 'UtensilsCrossed', 30),
('menu_knowledge', 'Menu Knowledge', 'AI knows your full menu', 'food', ARRAY['food'], 'BookOpen', 31),
('reservations', 'Table Reservations', 'Book dining reservations', 'food', ARRAY['food'], 'Clock', 32),
('catering', 'Catering Requests', 'Handle catering inquiries', 'food', ARRAY['food'], 'Cake', 33),
('delivery', 'Delivery Service', 'Offer food delivery', 'food', NULL, 'Bike', 34),
('dine_in', 'Dine-In Service', 'In-restaurant dining', 'food', ARRAY['food'], 'Armchair', 35),
('pickup', 'Pickup Orders', 'Customer pickup orders', 'food', ARRAY['food'], 'ShoppingBag', 36),
('medical_intake', 'Patient Intake', 'New patient registration flow', 'medical', ARRAY['medical'], 'ClipboardList', 40),
('insurance_verify', 'Insurance Verification', 'Check insurance coverage', 'medical', NULL, 'Shield', 41),
('hipaa_compliance', 'HIPAA Mode', 'Enable HIPAA-compliant data handling', 'medical', ARRAY['medical'], 'Lock', 42),
('telehealth', 'Telehealth', 'Virtual visit scheduling', 'medical', NULL, 'Video', 43),
('symptom_triage', 'Symptom Triage', 'Urgent symptom escalation rules', 'medical', NULL, 'Stethoscope', 44),
('callbacks', 'Callback Requests', 'Take callback requests', 'general', ARRAY['general'], 'PhoneCallback', 50),
('messaging', 'Message Taking', 'Take messages for follow-up', 'general', ARRAY['general'], 'Mail', 51),
('estimates', 'Estimate Requests', 'Generate quotes and estimates', 'general', NULL, 'Calculator', 52)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_enabled_for_modes = EXCLUDED.default_enabled_for_modes;

-- Create GIN index for faster capability queries
CREATE INDEX IF NOT EXISTS idx_tenants_capabilities 
ON tenants USING GIN (capabilities_json);

-- Add comment
COMMENT ON COLUMN public.tenants.capabilities_json IS 'Granular feature flags. Keys are capability IDs, values are booleans.';
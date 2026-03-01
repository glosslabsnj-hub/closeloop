-- Add universal dispatch fields for all business types
-- Enables: moving, junk removal, medical transport, limo, pet grooming, etc.

-- 1. Add new columns to dispatch_jobs for universal dispatch support
ALTER TABLE public.dispatch_jobs
ADD COLUMN IF NOT EXISTS dropoff_required boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS passenger_count integer,
ADD COLUMN IF NOT EXISTS item_count integer,
ADD COLUMN IF NOT EXISTS volume_estimate text,
ADD COLUMN IF NOT EXISTS weight_estimate text,
ADD COLUMN IF NOT EXISTS equipment_required text[],
ADD COLUMN IF NOT EXISTS special_requirements text[],
ADD COLUMN IF NOT EXISTS photo_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_schedule jsonb,
ADD COLUMN IF NOT EXISTS additional_stops jsonb,
ADD COLUMN IF NOT EXISTS pet_info jsonb,
ADD COLUMN IF NOT EXISTS patient_info jsonb,
ADD COLUMN IF NOT EXISTS inventory_items jsonb,
ADD COLUMN IF NOT EXISTS document_type text,
ADD COLUMN IF NOT EXISTS signer_count integer,
ADD COLUMN IF NOT EXISTS damage_type text,
ADD COLUMN IF NOT EXISTS affected_area_sqft integer,
ADD COLUMN IF NOT EXISTS service_category text;

-- 2. Add dispatch configuration to tenants for mode-specific settings
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS dispatch_config_json jsonb DEFAULT '{}';

-- 3. Create intake_field_templates for industry-specific suggested fields
CREATE TABLE IF NOT EXISTS public.intake_field_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_key text NOT NULL,
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  placeholder text,
  options_json jsonb,
  is_required boolean DEFAULT false,
  ai_prompt_hint text,
  validation_hint text,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(industry_key, field_key)
);

-- 4. Insert intake field templates for all dispatch industries
INSERT INTO public.intake_field_templates (industry_key, field_key, field_label, field_type, ai_prompt_hint, is_required, display_order) VALUES
-- Towing (existing, ensure complete)
('towing', 'vehicle_year', 'Vehicle Year', 'text', 'What year is the vehicle?', false, 1),
('towing', 'vehicle_make', 'Vehicle Make', 'text', 'What make is the vehicle - Ford, Toyota, etc?', true, 2),
('towing', 'vehicle_model', 'Vehicle Model', 'text', 'What model is it?', false, 3),
('towing', 'vehicle_condition', 'Vehicle Condition', 'select', 'Is the vehicle drivable or does it need to be winched onto the truck?', true, 4),
('towing', 'key_availability', 'Keys Available', 'boolean', 'Do you have the keys with you?', false, 5),

-- Locksmith
('locksmith', 'lock_type', 'Lock Type', 'select', 'Is this for a house, car, or commercial property?', true, 1),
('locksmith', 'service_type', 'Service Needed', 'select', 'Do you need a lockout, rekey, or new lock installation?', true, 2),
('locksmith', 'vehicle_info', 'Vehicle Info', 'text', 'What year and make is the vehicle?', false, 3),
('locksmith', 'lock_brand', 'Lock Brand', 'text', 'Do you know the brand of the lock?', false, 4),

-- Junk Removal
('junk_removal', 'item_description', 'Items to Remove', 'textarea', 'What items do you need removed?', true, 1),
('junk_removal', 'estimated_volume', 'Estimated Volume', 'select', 'About how much junk is there - a few items, a truck load, or multiple truck loads?', true, 2),
('junk_removal', 'item_location', 'Item Location', 'text', 'Where are the items located - curb, garage, inside the house?', true, 3),
('junk_removal', 'stairs_involved', 'Stairs Involved', 'boolean', 'Are there any stairs to navigate?', false, 4),
('junk_removal', 'heavy_items', 'Heavy Items', 'boolean', 'Any items over 100 pounds?', false, 5),

-- Moving Services
('moving', 'move_size', 'Move Size', 'select', 'Is this a studio, 1-bedroom, 2-bedroom, or larger?', true, 1),
('moving', 'origin_floor', 'Origin Floor', 'text', 'What floor are you moving from? Is there an elevator?', true, 2),
('moving', 'destination_floor', 'Destination Floor', 'text', 'What floor are you moving to? Elevator available?', true, 3),
('moving', 'large_items', 'Large Items', 'textarea', 'Any large items like pianos, safes, or pool tables?', false, 4),
('moving', 'packing_needed', 'Packing Services', 'boolean', 'Do you need packing services or just moving?', false, 5),
('moving', 'move_date', 'Move Date', 'date', 'When do you need to move?', true, 6),

-- Mobile Pet Grooming
('pet_grooming', 'pet_type', 'Pet Type', 'select', 'Is this for a dog, cat, or other pet?', true, 1),
('pet_grooming', 'pet_name', 'Pet Name', 'text', 'What''s your pet''s name?', false, 2),
('pet_grooming', 'pet_breed', 'Pet Breed', 'text', 'What breed is your pet?', true, 3),
('pet_grooming', 'pet_size', 'Pet Size', 'select', 'Is your pet small, medium, or large?', true, 4),
('pet_grooming', 'grooming_type', 'Service Type', 'select', 'What service do you need - full groom, bath, nail trim?', true, 5),
('pet_grooming', 'pet_temperament', 'Temperament', 'text', 'How does your pet handle grooming?', false, 6),

-- Medical Transport
('medical_transport', 'transport_type', 'Transport Type', 'select', 'Is this a wheelchair, stretcher, or ambulatory transport?', true, 1),
('medical_transport', 'patient_mobility', 'Patient Mobility', 'select', 'Can the patient walk, need assistance, or is non-ambulatory?', true, 2),
('medical_transport', 'oxygen_required', 'Oxygen Required', 'boolean', 'Does the patient require oxygen?', false, 3),
('medical_transport', 'appointment_time', 'Appointment Time', 'time', 'What time is the appointment?', true, 4),
('medical_transport', 'round_trip', 'Round Trip', 'boolean', 'Is this a round trip - do you need a return ride?', true, 5),
('medical_transport', 'facility_name', 'Facility Name', 'text', 'What is the name of the medical facility?', true, 6),

-- Limo / Black Car
('limo', 'occasion', 'Occasion', 'select', 'What''s the occasion - wedding, prom, airport, business?', true, 1),
('limo', 'passenger_count', 'Passengers', 'number', 'How many passengers will there be?', true, 2),
('limo', 'pickup_time', 'Pickup Time', 'time', 'What time do you need to be picked up?', true, 3),
('limo', 'vehicle_preference', 'Vehicle Preference', 'select', 'Any preference - sedan, SUV, stretch limo?', false, 4),
('limo', 'flight_info', 'Flight Information', 'text', 'If airport pickup, what''s your flight number?', false, 5),
('limo', 'hours_needed', 'Hours Needed', 'number', 'How many hours do you need the vehicle?', false, 6),

-- Courier / Delivery
('courier', 'package_description', 'Package Description', 'text', 'What are you sending?', true, 1),
('courier', 'package_size', 'Package Size', 'select', 'Is it envelope, small box, large box, or oversized?', true, 2),
('courier', 'package_weight', 'Approximate Weight', 'text', 'About how heavy is it?', false, 3),
('courier', 'delivery_urgency', 'Urgency', 'select', 'Is this same-day rush, standard same-day, or next-day?', true, 4),
('courier', 'signature_required', 'Signature Required', 'boolean', 'Is a signature required on delivery?', false, 5),

-- Mobile Mechanic
('mobile_mechanic', 'vehicle_info', 'Vehicle Info', 'text', 'What year, make, and model is your vehicle?', true, 1),
('mobile_mechanic', 'issue_description', 'Issue Description', 'textarea', 'What seems to be the problem?', true, 2),
('mobile_mechanic', 'vehicle_starts', 'Vehicle Starts', 'boolean', 'Does the vehicle start?', true, 3),
('mobile_mechanic', 'warning_lights', 'Warning Lights', 'text', 'Are there any warning lights on?', false, 4),
('mobile_mechanic', 'recent_repairs', 'Recent Repairs', 'text', 'Any recent repairs or work done?', false, 5),

-- Water/Fire Restoration
('restoration', 'damage_type', 'Damage Type', 'select', 'Is this water damage, fire damage, mold, or storm damage?', true, 1),
('restoration', 'affected_area', 'Affected Area', 'text', 'How large is the affected area - one room, multiple rooms, whole floor?', true, 2),
('restoration', 'damage_source', 'Damage Source', 'text', 'What caused the damage - pipe burst, flood, fire?', true, 3),
('restoration', 'standing_water', 'Standing Water', 'boolean', 'Is there standing water present?', false, 4),
('restoration', 'insurance_claim', 'Insurance Claim', 'boolean', 'Will this be an insurance claim?', false, 5),

-- Tree Service
('tree_service', 'service_type', 'Service Type', 'select', 'Do you need tree removal, trimming, stump grinding, or emergency service?', true, 1),
('tree_service', 'tree_count', 'Number of Trees', 'number', 'How many trees need service?', true, 2),
('tree_service', 'tree_size', 'Tree Size', 'select', 'Approximately how tall - under 20 feet, 20-40 feet, or over 40 feet?', true, 3),
('tree_service', 'near_structures', 'Near Structures', 'boolean', 'Is the tree near any buildings or power lines?', true, 4),
('tree_service', 'debris_removal', 'Debris Removal', 'boolean', 'Do you need the debris hauled away?', true, 5),

-- Septic / Waste
('septic', 'service_type', 'Service Type', 'select', 'Is this for pumping, inspection, or emergency service?', true, 1),
('septic', 'tank_size', 'Tank Size', 'select', 'Do you know your tank size - 500, 750, 1000, 1500 gallons?', false, 2),
('septic', 'last_pumped', 'Last Pumped', 'text', 'When was the tank last pumped?', false, 3),
('septic', 'access_clear', 'Access Clear', 'boolean', 'Is the tank lid accessible and uncovered?', true, 4),
('septic', 'backup_present', 'Backup Present', 'boolean', 'Is there currently a backup in the house?', true, 5),

-- Mobile Notary
('notary', 'document_type', 'Document Type', 'select', 'What type of document - loan signing, power of attorney, real estate, general?', true, 1),
('notary', 'signer_count', 'Number of Signers', 'number', 'How many people need to sign?', true, 2),
('notary', 'document_count', 'Document Count', 'number', 'Approximately how many pages or documents?', false, 3),
('notary', 'appointment_time', 'Preferred Time', 'time', 'What time works best?', true, 4),
('notary', 'location_type', 'Location Type', 'select', 'Where will this take place - home, office, hospital, other?', true, 5),

-- Security Patrol
('security', 'patrol_type', 'Service Type', 'select', 'Is this for a one-time patrol, recurring service, or emergency response?', true, 1),
('security', 'property_type', 'Property Type', 'select', 'Is this residential, commercial, construction site, or event?', true, 2),
('security', 'patrol_frequency', 'Patrol Frequency', 'text', 'How often do you need patrols - hourly, twice nightly, etc?', false, 3),
('security', 'incident_type', 'Current Incident', 'text', 'Is there a current incident we should know about?', false, 4),
('security', 'access_instructions', 'Access Instructions', 'text', 'How should the patrol officer access the property?', false, 5)

ON CONFLICT (industry_key, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  ai_prompt_hint = EXCLUDED.ai_prompt_hint,
  is_required = EXCLUDED.is_required;

-- Enable RLS
ALTER TABLE public.intake_field_templates ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users (templates are global)
DROP POLICY IF EXISTS "Anyone can read intake templates" ON public.intake_field_templates;
CREATE POLICY "Anyone can read intake templates"
  ON public.intake_field_templates
  FOR SELECT TO authenticated
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.intake_field_templates IS 'Pre-defined intake field templates for different dispatch industries';
COMMENT ON COLUMN public.dispatch_jobs.dropoff_required IS 'Whether job requires a dropoff location (false for locksmith, mechanic, etc.)';
COMMENT ON COLUMN public.dispatch_jobs.passenger_count IS 'Number of passengers (limo, medical transport)';
COMMENT ON COLUMN public.dispatch_jobs.volume_estimate IS 'Estimated volume (junk removal, moving)';
COMMENT ON COLUMN public.dispatch_jobs.additional_stops IS 'Multi-stop routes as JSONB array';
COMMENT ON COLUMN public.dispatch_jobs.pet_info IS 'Pet details for mobile grooming (name, breed, size, temperament)';
COMMENT ON COLUMN public.dispatch_jobs.patient_info IS 'Patient details for medical transport (mobility, equipment needs)';
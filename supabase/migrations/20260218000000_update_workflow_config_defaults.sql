-- Migration: Update workflow config defaults to match best practices
-- Purpose: Fix defaults based on real-world testing and user feedback
-- Date: 2026-02-18

-- =====================================================
-- DISPATCH WORKFLOW CONFIG - UPDATE DEFAULTS
-- =====================================================

-- Update existing dispatch tenants with better defaults
UPDATE dispatch_workflow_config
SET
  -- Most towing companies charge flat rates, don't need vehicle for pricing
  vehicle_info_timing = 'after_pricing',

  -- Enable luxury flatbed recommendations (better UX, educates customers)
  luxury_flatbed_recommendation = true,

  -- Enable AWD detection (explains WHY flatbed costs more)
  awd_detection_enabled = true,

  -- Better luxury brand list (includes more common brands)
  luxury_brands = ARRAY[
    'Mercedes', 'BMW', 'Audi', 'Porsche', 'Tesla', 'Lexus',
    'Maserati', 'Bentley', 'Rolls-Royce', 'Ferrari', 'Lamborghini',
    'Jaguar', 'Land Rover', 'Range Rover', 'Cadillac Escalade'
  ],

  -- Better payment message (more natural speech)
  payment_due_message = 'Payment is due when the driver arrives. We accept cash and card.',

  -- Better address confirmation script (more natural)
  address_confirmation_script = 'Just to confirm, that''s at {{geocoded_address}}, right?',

  -- Better driver callback script (sets clear expectations)
  driver_callback_script = 'Your driver will give you a call when they''re about 10 minutes away.',

  updated_at = now()
WHERE
  -- Only update defaults, not custom values
  -- If someone has customized these, don't overwrite
  vehicle_info_timing = 'before_pricing'
  AND luxury_flatbed_recommendation = false
  AND awd_detection_enabled = false;

-- =====================================================
-- SERVICE WORKFLOW CONFIG - UPDATE DEFAULTS
-- =====================================================

UPDATE service_workflow_config
SET
  -- Better booking confirmation script (more enthusiastic)
  booking_confirmation_script = 'Perfect! You''re all set for {{date}} at {{time}}. Looking forward to seeing you!',

  -- Enable SMS confirmations by default (reduces no-shows)
  send_sms_confirmation = true,

  -- Allow AI to reschedule (better customer experience)
  allow_ai_rescheduling = true,

  updated_at = now()
WHERE
  -- Only update if still using original defaults
  booking_confirmation_script = 'Perfect! You''re all set for {{date}} at {{time}}'
  AND allow_ai_rescheduling = true;

-- =====================================================
-- COMMENTS - Document the rationale
-- =====================================================

COMMENT ON COLUMN dispatch_workflow_config.vehicle_info_timing IS
'When to collect vehicle info: before_pricing (affects quote), after_pricing (just for driver notes), optional (skip unless needed). DEFAULT: after_pricing (most towing is flat-rate)';

COMMENT ON COLUMN dispatch_workflow_config.luxury_flatbed_recommendation IS
'Enable flatbed recommendations for luxury vehicles (BMW, Mercedes, etc.). DEFAULT: true (educates customers, prevents complaints about AWD damage)';

COMMENT ON COLUMN dispatch_workflow_config.awd_detection_enabled IS
'Ask about all-wheel drive for luxury vehicles. DEFAULT: true (explains WHY flatbed costs more, reduces price objections)';

COMMENT ON COLUMN dispatch_workflow_config.payment_due_message IS
'Script for explaining when payment is due. Should be speech-ready and natural. Can include {{price}} placeholder.';

COMMENT ON COLUMN dispatch_workflow_config.driver_callback_script IS
'Script explaining when driver will call. Should set clear expectations to reduce "where is my driver?" calls.';

-- =====================================================
-- ALTER TABLE - Fix column defaults for future tenants
-- =====================================================

-- Update dispatch config defaults
ALTER TABLE dispatch_workflow_config
  ALTER COLUMN vehicle_info_timing SET DEFAULT 'after_pricing',
  ALTER COLUMN luxury_flatbed_recommendation SET DEFAULT true,
  ALTER COLUMN awd_detection_enabled SET DEFAULT true,
  ALTER COLUMN luxury_brands SET DEFAULT ARRAY[
    'Mercedes', 'BMW', 'Audi', 'Porsche', 'Tesla', 'Lexus',
    'Maserati', 'Bentley', 'Rolls-Royce', 'Ferrari', 'Lamborghini',
    'Jaguar', 'Land Rover', 'Range Rover', 'Cadillac Escalade'
  ],
  ALTER COLUMN payment_due_message SET DEFAULT 'Payment is due when the driver arrives. We accept cash and card.',
  ALTER COLUMN address_confirmation_script SET DEFAULT 'Just to confirm, that''s at {{geocoded_address}}, right?',
  ALTER COLUMN driver_callback_script SET DEFAULT 'Your driver will give you a call when they''re about 10 minutes away.';

-- Update service config defaults
ALTER TABLE service_workflow_config
  ALTER COLUMN booking_confirmation_script SET DEFAULT 'Perfect! You''re all set for {{date}} at {{time}}. Looking forward to seeing you!',
  ALTER COLUMN send_sms_confirmation SET DEFAULT true,
  ALTER COLUMN allow_ai_rescheduling SET DEFAULT true;

-- =====================================================
-- VERIFICATION QUERY (run after migration)
-- =====================================================

-- Run this to verify the migration worked:
/*
SELECT
  t.business_name,
  d.vehicle_info_timing,
  d.luxury_flatbed_recommendation,
  d.awd_detection_enabled,
  d.payment_due_message,
  d.driver_callback_script
FROM dispatch_workflow_config d
JOIN tenants t ON t.id = d.tenant_id
WHERE t.business_mode = 'dispatch'
LIMIT 10;
*/

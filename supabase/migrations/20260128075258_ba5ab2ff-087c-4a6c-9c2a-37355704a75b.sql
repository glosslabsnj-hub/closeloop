-- Fix RLS policies on tenants table to ensure authenticated users can create tenants
-- First drop any existing problematic policies
DROP POLICY IF EXISTS "Authenticated users can create tenants during onboarding" ON public.tenants;

-- Create a permissive INSERT policy that allows authenticated users without a tenant to create one
CREATE POLICY "Authenticated users can create tenants during onboarding"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also ensure tenant_users INSERT policy exists
DROP POLICY IF EXISTS "Users can create their own tenant_user record" ON public.tenant_users;
CREATE POLICY "Users can create their own tenant_user record"
  ON public.tenant_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Now create a demo auto detailing business for testing
-- Using a fixed UUID for the demo tenant
DO $$
DECLARE
  v_demo_user_id UUID;
  v_demo_tenant_id UUID := 'a0000000-0000-0000-0000-000000000001';
  v_demo_email TEXT := 'jackangelini@icloud.com';
BEGIN
  -- Get the user ID for the demo account
  SELECT id INTO v_demo_user_id FROM auth.users WHERE email = v_demo_email;
  
  IF v_demo_user_id IS NULL THEN
    RAISE NOTICE 'Demo user not found, skipping demo data setup';
    RETURN;
  END IF;
  
  -- Delete any existing demo data
  DELETE FROM tenant_users WHERE user_id = v_demo_user_id;
  DELETE FROM subscriptions WHERE tenant_id = v_demo_tenant_id;
  DELETE FROM assistant_settings WHERE tenant_id = v_demo_tenant_id;
  DELETE FROM services WHERE tenant_id = v_demo_tenant_id;
  DELETE FROM business_faqs WHERE tenant_id = v_demo_tenant_id;
  DELETE FROM objection_responses WHERE tenant_id = v_demo_tenant_id;
  DELETE FROM tenants WHERE id = v_demo_tenant_id;
  
  -- Create the demo tenant with auto detailing business info
  INSERT INTO tenants (
    id, name, tagline, industry, timezone, phone_public, address, website_url,
    years_in_business, ai_enabled, ai_readiness_score, onboarding_completed_at,
    hours_json, cancellation_policy, deposit_policy, refund_policy, payment_methods,
    min_lead_hours, max_advance_days, appointment_buffer_minutes
  ) VALUES (
    v_demo_tenant_id,
    'Elite Auto Detailing',
    'Premium Mobile Detailing That Comes to You',
    'detailing',
    'America/Los_Angeles',
    '+15551234567',
    '123 Main Street, Los Angeles, CA 90001',
    'https://eliteautodetailing.com',
    5,
    true,
    85,
    now(),
    '{
      "monday": {"open": "08:00", "close": "18:00", "closed": false},
      "tuesday": {"open": "08:00", "close": "18:00", "closed": false},
      "wednesday": {"open": "08:00", "close": "18:00", "closed": false},
      "thursday": {"open": "08:00", "close": "18:00", "closed": false},
      "friday": {"open": "08:00", "close": "18:00", "closed": false},
      "saturday": {"open": "09:00", "close": "16:00", "closed": false},
      "sunday": {"open": "00:00", "close": "00:00", "closed": true}
    }'::JSONB,
    'Cancellations must be made at least 24 hours in advance for a full refund. Same-day cancellations may be subject to a 50% fee.',
    'A 25% deposit is required to secure your appointment. The deposit is applied to your final balance.',
    'Full refunds available for cancellations made 24+ hours in advance. No refunds for no-shows.',
    ARRAY['cash', 'credit_card', 'venmo', 'zelle'],
    24,
    30,
    30
  );
  
  -- Link user to tenant as owner
  INSERT INTO tenant_users (tenant_id, user_id, role)
  VALUES (v_demo_tenant_id, v_demo_user_id, 'owner');
  
  -- Create subscription (trialing for 7 days)
  INSERT INTO subscriptions (tenant_id, plan_code, status, current_period_end)
  VALUES (v_demo_tenant_id, 'both', 'trialing', now() + interval '7 days');
  
  -- Create assistant settings
  INSERT INTO assistant_settings (
    tenant_id, instant_text_enabled, voice_ai_enabled, voice_mode, missed_call_behavior,
    phone_connected, go_live_enabled
  ) VALUES (
    v_demo_tenant_id, true, true, 'busy_mode', 'both', false, false
  );
  
  -- Create services
  INSERT INTO services (tenant_id, name, description, duration_minutes, price_type, price_amount, deposit_required, deposit_amount, is_active, preparation_instructions) VALUES
    (v_demo_tenant_id, 'Basic Wash', 'Exterior hand wash with wheel cleaning and tire dressing', 45, 'fixed', 49.99, false, NULL, true, 'Please remove any personal items from the exterior of the vehicle.'),
    (v_demo_tenant_id, 'Interior Detail', 'Complete interior vacuum, wipe-down, and conditioning of all surfaces', 90, 'fixed', 149.99, true, 50.00, true, 'Remove all trash and personal items from the interior.'),
    (v_demo_tenant_id, 'Full Detail Package', 'Complete interior and exterior detail including paint correction and ceramic coating', 240, 'starting_at', 399.99, true, 100.00, true, 'Vehicle should be reasonably clean. Remove all personal items.'),
    (v_demo_tenant_id, 'Paint Correction', 'Multi-stage paint correction to remove swirl marks and scratches', 480, 'starting_at', 599.99, true, 150.00, true, 'Vehicle must be washed before appointment. We will assess the paint condition on arrival.'),
    (v_demo_tenant_id, 'Ceramic Coating', 'Professional-grade ceramic coating with 2-year warranty', 360, 'fixed', 899.99, true, 250.00, true, 'Paint correction is required before ceramic coating application.');
  
  -- Create FAQs
  INSERT INTO business_faqs (tenant_id, question, answer, priority_weight) VALUES
    (v_demo_tenant_id, 'Do you come to my location?', 'Yes! We are a mobile detailing service. We come to your home, office, or any location convenient for you within our service area (25 miles from downtown LA).', 100),
    (v_demo_tenant_id, 'How long does a full detail take?', 'A full detail typically takes 3-4 hours depending on the size and condition of your vehicle. We''ll give you an accurate time estimate when you book.', 90),
    (v_demo_tenant_id, 'What forms of payment do you accept?', 'We accept cash, all major credit cards, Venmo, and Zelle. Payment is due upon completion of service.', 80),
    (v_demo_tenant_id, 'Do I need to be present during the detail?', 'No, you don''t need to be present. Just leave the keys in a secure location and we''ll take care of the rest. We''ll send you before/after photos when complete.', 70),
    (v_demo_tenant_id, 'How often should I get my car detailed?', 'We recommend a full detail every 3-4 months to maintain your vehicle''s appearance and protect your investment. Basic washes can be done monthly.', 60),
    (v_demo_tenant_id, 'What if it rains on my appointment day?', 'We monitor the weather closely. If rain is expected, we''ll reach out to reschedule at no charge. Interior-only services can still be performed.', 50);
  
  -- Create objection responses
  INSERT INTO objection_responses (tenant_id, objection, response, priority_weight) VALUES
    (v_demo_tenant_id, 'That''s too expensive', 'I understand budget is important. Our pricing reflects the premium products we use and the attention to detail we provide. Many customers find that professional detailing actually saves money long-term by protecting their vehicle''s value. Would you like to start with our Basic Wash to experience our quality?', 100),
    (v_demo_tenant_id, 'I can just go to a car wash', 'Automated car washes can actually damage your paint with their brushes and harsh chemicals. Our hand-wash process is much gentler and we use pH-balanced, paint-safe products. Plus, we come to you so you save time!', 90),
    (v_demo_tenant_id, 'I need to think about it', 'Of course, take your time! Just so you know, our calendar fills up quickly, especially on weekends. Would you like me to tentatively hold a spot for you while you decide? No obligation.', 80),
    (v_demo_tenant_id, 'Can you do it cheaper?', 'Our prices reflect the quality of service and products we use. However, we do offer package deals if you book multiple services or set up recurring appointments. Would you like to hear about those options?', 70);
  
  RAISE NOTICE 'Demo account created successfully for %', v_demo_email;
END $$;
-- =====================================================
-- INDUSTRY-SPECIFIC DEFAULT RECOVERY SEQUENCES
-- =====================================================

-- Function to create default recovery sequence for a tenant based on business_mode
CREATE OR REPLACE FUNCTION public.create_default_recovery_sequence(
  p_tenant_id UUID,
  p_business_mode TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence_id UUID;
  v_sequence_name TEXT;
  v_sequence_description TEXT;
  v_trigger_outcomes TEXT[];
BEGIN
  -- Delete existing default sequence for this tenant if any
  DELETE FROM lead_recovery_sequences 
  WHERE tenant_id = p_tenant_id AND is_default = true;

  -- Set sequence details based on business mode
  CASE p_business_mode
    WHEN 'service' THEN
      v_sequence_name := 'Service Follow-Up';
      v_sequence_description := 'Standard follow-up sequence for service businesses';
      v_trigger_outcomes := ARRAY['followup', 'callback_requested', 'no_answer', 'price_objection', 'needs_approval'];
    WHEN 'dispatch' THEN
      v_sequence_name := 'Dispatch Recovery';
      v_sequence_description := 'Faster follow-up sequence for urgent dispatch services';
      v_trigger_outcomes := ARRAY['followup', 'callback_requested', 'no_answer', 'price_objection'];
    WHEN 'food' THEN
      v_sequence_name := 'Dining Follow-Up';
      v_sequence_description := 'Gentle follow-up for food service inquiries';
      v_trigger_outcomes := ARRAY['followup', 'callback_requested', 'scheduling_conflict'];
    WHEN 'medical' THEN
      v_sequence_name := 'Healthcare Follow-Up';
      v_sequence_description := 'Professional follow-up for healthcare appointments';
      v_trigger_outcomes := ARRAY['followup', 'callback_requested', 'needs_approval', 'scheduling_conflict'];
    ELSE -- 'general' or any other
      v_sequence_name := 'Standard Follow-Up';
      v_sequence_description := 'General-purpose follow-up sequence';
      v_trigger_outcomes := ARRAY['followup', 'callback_requested', 'no_answer'];
  END CASE;

  -- Create the sequence
  INSERT INTO lead_recovery_sequences (
    tenant_id,
    name,
    description,
    is_default,
    is_active,
    is_system_template,
    trigger_on_outcomes,
    target_business_mode
  ) VALUES (
    p_tenant_id,
    v_sequence_name,
    v_sequence_description,
    true,
    true,
    true,
    v_trigger_outcomes,
    p_business_mode
  ) RETURNING id INTO v_sequence_id;

  -- Create steps based on business mode
  CASE p_business_mode
    WHEN 'service' THEN
      -- Step 1: SMS after 1 hour
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 1, 60, 'sms', 
        'Hi {{customer_first_name}}, this is {{business_name}}. Thanks for calling about {{service_interest}}! We have availability this week. Reply YES to schedule or call us at {{business_phone}}.', 
        true);
      
      -- Step 2: AI Call after 24 hours
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, ai_call_purpose, ai_call_script_hints, ai_call_max_duration_seconds, respect_business_hours)
      VALUES (v_sequence_id, 2, 1440, 'ai_call', 'follow_up',
        'The customer called yesterday about {{service_interest}}. They mentioned: {{original_objection}}. Follow up warmly, address their concern, offer to schedule.',
        120, true);
      
      -- Step 3: SMS after 72 hours (3 days)
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 3, 4320, 'sms',
        'Hi {{customer_first_name}}, just checking in from {{business_name}}. Still need help with {{service_interest}}? We''re here when you''re ready. {{business_phone}}',
        true);
      
      -- Step 4: SMS after 168 hours (7 days)
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 4, 10080, 'sms',
        '{{customer_first_name}}, last follow-up from {{business_name}}! Don''t forget about your {{service_interest}} needs. Book this week and mention ''{{offer_code}}'' for {{offer_description}}. {{business_phone}}',
        true);

    WHEN 'dispatch' THEN
      -- Step 1: SMS after 30 minutes
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 1, 30, 'sms',
        'Hi {{customer_first_name}}, this is {{business_name}}. Still need help? We have trucks available NOW. Call {{business_phone}} or reply YES and we''ll call you right back.',
        false); -- Dispatch doesn't respect business hours
      
      -- Step 2: SMS after 4 hours
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 2, 240, 'sms',
        '{{customer_first_name}}, {{business_name}} here. Just wanted to make sure you got the help you needed. If you still need service, we''re available 24/7. {{business_phone}}',
        false);
      
      -- Step 3: SMS after 24 hours
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 3, 1440, 'sms',
        'Hi {{customer_first_name}}, hope everything worked out! If you need towing, roadside help, or have a vehicle in impound, {{business_name}} is here for you. {{business_phone}}',
        false);
      
      -- Step 4: Internal Task after 72 hours (3 days)
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, task_description, task_priority, respect_business_hours)
      VALUES (v_sequence_id, 4, 4320, 'internal_task',
        'Manual follow-up: {{customer_name}} called about {{service_interest}} - never booked. Worth a quick call?',
        'normal', true);

    WHEN 'food' THEN
      -- Step 1: SMS after 2 hours
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 1, 120, 'sms',
        'Hi {{customer_first_name}}! Thanks for calling {{business_name}}. Looking forward to serving you! Book your table at {{booking_link}} or call {{business_phone}}.',
        true);
      
      -- Step 2: SMS after 24 hours
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 2, 1440, 'sms',
        '{{customer_first_name}}, still thinking about {{business_name}}? Mention ''{{offer_code}}'' for {{offer_description}} on your next visit! {{business_phone}}',
        true);
      
      -- Step 3: SMS after 5 days
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 3, 7200, 'sms',
        'Hi {{customer_first_name}}, we''d love to have you at {{business_name}}! Your table is waiting. {{business_phone}} 🍽️',
        true);
      
      -- Step 4: SMS after 14 days
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 4, 20160, 'sms',
        '{{customer_first_name}}, it''s been a while! {{business_name}} misses you. Come back for {{offer_description}}. {{business_phone}}',
        true);

    WHEN 'medical' THEN
      -- Step 1: SMS after 4 hours
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 1, 240, 'sms',
        'Hi {{customer_first_name}}, thank you for contacting {{business_name}}. We''re here to help with your healthcare needs. Schedule online at {{booking_link}} or call {{business_phone}}.',
        true);
      
      -- Step 2: SMS after 48 hours
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 2, 2880, 'sms',
        '{{customer_first_name}}, just a friendly reminder from {{business_name}}. We have appointments available this week for your {{service_interest}}. {{business_phone}}',
        true);
      
      -- Step 3: Internal Task after 7 days
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, task_description, task_priority, respect_business_hours)
      VALUES (v_sequence_id, 3, 10080, 'internal_task',
        'Follow up with {{customer_name}} about {{service_interest}} - patient inquiry, no appointment scheduled',
        'normal', true);
      
      -- Step 4: SMS after 14 days
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 4, 20160, 'sms',
        'Hi {{customer_first_name}}, {{business_name}} here. Don''t put off your {{service_interest}} - your health is important! Book online: {{booking_link}} or call {{business_phone}}',
        true);

    ELSE -- 'general' or any other
      -- Step 1: SMS after 1 hour
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 1, 60, 'sms',
        'Hi {{customer_first_name}}, this is {{business_name}}. Thanks for reaching out! We''d love to help. Reply to this message or call {{business_phone}}.',
        true);
      
      -- Step 2: SMS after 24 hours
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 2, 1440, 'sms',
        '{{customer_first_name}}, following up from {{business_name}}. Let us know if you have any questions - we''re here to help! {{business_phone}}',
        true);
      
      -- Step 3: SMS after 3 days
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 3, 4320, 'sms',
        'Hi {{customer_first_name}}, just checking in from {{business_name}}. Ready when you are! {{business_phone}}',
        true);
      
      -- Step 4: SMS after 7 days
      INSERT INTO lead_recovery_sequence_steps (sequence_id, step_order, delay_minutes, action_type, message_template, respect_business_hours)
      VALUES (v_sequence_id, 4, 10080, 'sms',
        '{{customer_first_name}}, last message from {{business_name}}. We''re here if you need us. {{business_phone}}',
        true);
  END CASE;

  RETURN v_sequence_id;
END;
$$;

-- Function to ensure tenant has a default sequence
CREATE OR REPLACE FUNCTION public.ensure_tenant_has_default_sequence(p_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_sequence_id UUID;
  v_business_mode TEXT;
BEGIN
  -- Check if tenant already has a default sequence
  SELECT id INTO v_existing_sequence_id
  FROM lead_recovery_sequences
  WHERE tenant_id = p_tenant_id AND is_default = true
  LIMIT 1;

  IF v_existing_sequence_id IS NOT NULL THEN
    RETURN v_existing_sequence_id;
  END IF;

  -- Get tenant's business mode
  SELECT COALESCE(business_mode, 'general') INTO v_business_mode
  FROM tenants
  WHERE id = p_tenant_id;

  IF v_business_mode IS NULL THEN
    v_business_mode := 'general';
  END IF;

  -- Create and return the default sequence
  RETURN create_default_recovery_sequence(p_tenant_id, v_business_mode);
END;
$$;

-- Function to create default templates for a tenant
CREATE OR REPLACE FUNCTION public.create_default_recovery_templates(
  p_tenant_id UUID,
  p_business_mode TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing default templates
  DELETE FROM lead_recovery_templates 
  WHERE tenant_id = p_tenant_id AND is_default = true;

  -- Create templates based on business mode
  CASE p_business_mode
    WHEN 'service' THEN
      INSERT INTO lead_recovery_templates (tenant_id, name, channel, content, category, is_default) VALUES
        (p_tenant_id, 'Quick Check-In', 'sms', 'Hi {{customer_first_name}}, just checking in from {{business_name}}. Still need help with {{service_interest}}? We''re here! {{business_phone}}', 'follow_up', true),
        (p_tenant_id, 'Special Offer', 'sms', '{{customer_first_name}}, special offer from {{business_name}}! Mention ''COMEBACK10'' for 10% off your {{service_interest}}. Limited time! {{business_phone}}', 'offer', true),
        (p_tenant_id, 'We Miss You', 'sms', 'Hi {{customer_first_name}}, it''s been a while! {{business_name}} is ready to help with your home service needs. What can we do for you? {{business_phone}}', 'last_chance', true);
        
    WHEN 'dispatch' THEN
      INSERT INTO lead_recovery_templates (tenant_id, name, channel, content, category, is_default) VALUES
        (p_tenant_id, 'Quick Check-In', 'sms', 'Hi {{customer_first_name}}, {{business_name}} here. Everything OK? If you still need help, we''re available 24/7! {{business_phone}}', 'follow_up', true),
        (p_tenant_id, 'Priority Service', 'sms', '{{customer_first_name}}, need priority service? {{business_name}} can get to you FAST. Call now: {{business_phone}}', 'offer', true),
        (p_tenant_id, 'Always Here', 'sms', 'Hi {{customer_first_name}}, just a reminder: {{business_name}} is here 24/7 for towing, roadside, and impound services. Save our number! {{business_phone}}', 'last_chance', true);
        
    WHEN 'food' THEN
      INSERT INTO lead_recovery_templates (tenant_id, name, channel, content, category, is_default) VALUES
        (p_tenant_id, 'Quick Check-In', 'sms', 'Hi {{customer_first_name}}! Still thinking about {{business_name}}? We''d love to serve you soon. {{business_phone}}', 'follow_up', true),
        (p_tenant_id, 'Special Offer', 'sms', '{{customer_first_name}}, special treat from {{business_name}}! Mention ''FREEAPP'' for a free appetizer with your meal. {{business_phone}} 🍽️', 'offer', true),
        (p_tenant_id, 'We Miss You', 'sms', 'Hi {{customer_first_name}}, {{business_name}} misses you! Come in this week and we''ll take care of you. {{business_phone}}', 'last_chance', true);
        
    WHEN 'medical' THEN
      INSERT INTO lead_recovery_templates (tenant_id, name, channel, content, category, is_default) VALUES
        (p_tenant_id, 'Quick Check-In', 'sms', 'Hi {{customer_first_name}}, {{business_name}} here. Ready to schedule your appointment? We have openings this week. {{business_phone}}', 'follow_up', true),
        (p_tenant_id, 'Free Consultation', 'sms', '{{customer_first_name}}, {{business_name}} is offering a free consultation for new patients. Your health matters! {{business_phone}}', 'offer', true),
        (p_tenant_id, 'Health Reminder', 'sms', 'Hi {{customer_first_name}}, gentle reminder from {{business_name}}: don''t put off your healthcare. We''re here to help. {{business_phone}}', 'last_chance', true);
        
    ELSE -- 'general'
      INSERT INTO lead_recovery_templates (tenant_id, name, channel, content, category, is_default) VALUES
        (p_tenant_id, 'Quick Check-In', 'sms', 'Hi {{customer_first_name}}, just checking in from {{business_name}}. How can we help you today? {{business_phone}}', 'follow_up', true),
        (p_tenant_id, 'Special Offer', 'sms', '{{customer_first_name}}, special offer from {{business_name}}! Mention ''SAVE10'' for 10% off. Limited time! {{business_phone}}', 'offer', true),
        (p_tenant_id, 'We''re Here', 'sms', 'Hi {{customer_first_name}}, {{business_name}} is here when you need us. Give us a call anytime! {{business_phone}}', 'last_chance', true);
  END CASE;
END;
$$;

-- Update the tenant creation trigger to also set default offers
CREATE OR REPLACE FUNCTION public.initialize_lead_recovery_for_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_mode TEXT;
  v_offer_code TEXT;
  v_offer_description TEXT;
BEGIN
  -- Get business mode
  v_business_mode := COALESCE(NEW.business_mode, 'general');
  
  -- Set default offers based on business mode
  CASE v_business_mode
    WHEN 'service' THEN
      v_offer_code := 'COMEBACK10';
      v_offer_description := '10% off your service';
    WHEN 'dispatch' THEN
      v_offer_code := 'PRIORITY';
      v_offer_description := 'Priority dispatch, no wait';
    WHEN 'food' THEN
      v_offer_code := 'FREEAPP';
      v_offer_description := 'a free appetizer';
    WHEN 'medical' THEN
      v_offer_code := 'FREECONS';
      v_offer_description := 'a free consultation';
    ELSE
      v_offer_code := 'SAVE10';
      v_offer_description := '10% off';
  END CASE;

  -- Insert or update lead_recovery_settings with default offers
  INSERT INTO lead_recovery_settings (
    tenant_id,
    recovery_enabled,
    auto_start_recovery,
    default_offer_code,
    default_offer_description
  ) VALUES (
    NEW.id,
    true,
    true,
    v_offer_code,
    v_offer_description
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    default_offer_code = EXCLUDED.default_offer_code,
    default_offer_description = EXCLUDED.default_offer_description,
    updated_at = now();

  -- Create default recovery sequence
  PERFORM create_default_recovery_sequence(NEW.id, v_business_mode);
  
  -- Create default templates
  PERFORM create_default_recovery_templates(NEW.id, v_business_mode);

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS trigger_initialize_lead_recovery ON tenants;
CREATE TRIGGER trigger_initialize_lead_recovery
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION initialize_lead_recovery_for_tenant();

-- =====================================================
-- MIGRATE EXISTING TENANTS
-- =====================================================

-- Create default sequences and templates for all existing tenants
DO $$
DECLARE
  r RECORD;
  v_business_mode TEXT;
  v_offer_code TEXT;
  v_offer_description TEXT;
BEGIN
  FOR r IN SELECT id, business_mode FROM tenants LOOP
    v_business_mode := COALESCE(r.business_mode, 'general');
    
    -- Set default offers based on business mode
    CASE v_business_mode
      WHEN 'service' THEN
        v_offer_code := 'COMEBACK10';
        v_offer_description := '10% off your service';
      WHEN 'dispatch' THEN
        v_offer_code := 'PRIORITY';
        v_offer_description := 'Priority dispatch, no wait';
      WHEN 'food' THEN
        v_offer_code := 'FREEAPP';
        v_offer_description := 'a free appetizer';
      WHEN 'medical' THEN
        v_offer_code := 'FREECONS';
        v_offer_description := 'a free consultation';
      ELSE
        v_offer_code := 'SAVE10';
        v_offer_description := '10% off';
    END CASE;
    
    -- Update lead_recovery_settings with default offers
    UPDATE lead_recovery_settings 
    SET 
      default_offer_code = v_offer_code,
      default_offer_description = v_offer_description,
      updated_at = now()
    WHERE tenant_id = r.id;
    
    -- Create default sequence if none exists
    IF NOT EXISTS (
      SELECT 1 FROM lead_recovery_sequences 
      WHERE tenant_id = r.id AND is_default = true
    ) THEN
      PERFORM create_default_recovery_sequence(r.id, v_business_mode);
    END IF;
    
    -- Create default templates if none exist
    IF NOT EXISTS (
      SELECT 1 FROM lead_recovery_templates 
      WHERE tenant_id = r.id AND is_default = true
    ) THEN
      PERFORM create_default_recovery_templates(r.id, v_business_mode);
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_default_recovery_sequence(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_tenant_has_default_sequence(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_recovery_templates(UUID, TEXT) TO authenticated;
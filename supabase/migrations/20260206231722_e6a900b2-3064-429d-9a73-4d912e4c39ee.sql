
-- Fix get_ai_readiness RPC to properly use FOUND variable for assistant_record

CREATE OR REPLACE FUNCTION public.get_ai_readiness(tenant_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  tenant_record record;
  assistant_record record;
  has_assistant boolean := false;
  services_count integer;
  menu_items_count integer;
  faqs_count integer;
  has_data_retention boolean;
  data_retention_record record;
  intake_fields jsonb;
  food_settings jsonb;
  p0_flags text[] := '{}';
  p1_flags text[] := '{}';
  recommendations jsonb := '[]'::jsonb;
  score integer := 0;
  business_mode text;
  booking_mode_value text;
BEGIN
  -- Fetch tenant data
  SELECT * INTO tenant_record FROM tenants WHERE id = tenant_uuid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Tenant not found', 'score', 0);
  END IF;

  -- Fetch assistant settings with proper FOUND check
  SELECT * INTO assistant_record FROM assistant_settings WHERE tenant_id = tenant_uuid;
  has_assistant := FOUND;
  
  -- Get booking mode value ONLY if we found the record
  IF has_assistant THEN
    booking_mode_value := assistant_record.ai_booking_mode;
  ELSE
    booking_mode_value := NULL;
  END IF;

  -- Get counts
  SELECT COUNT(*) INTO services_count FROM services WHERE tenant_id = tenant_uuid AND is_active = true;
  SELECT COUNT(*) INTO menu_items_count FROM menu_items WHERE tenant_id = tenant_uuid AND is_available = true;
  SELECT COUNT(*) INTO faqs_count FROM business_faqs WHERE tenant_id = tenant_uuid;

  -- Check data retention settings
  SELECT * INTO data_retention_record FROM data_retention_settings WHERE tenant_id = tenant_uuid;
  has_data_retention := FOUND;

  -- Get business mode
  business_mode := COALESCE(tenant_record.business_mode::text, 'service');
  intake_fields := COALESCE(tenant_record.context_fields_json, '[]'::jsonb);
  food_settings := COALESCE(tenant_record.food_settings, '{}'::jsonb);

  -- ============================================
  -- GLOBAL CHECKS (ALL MODES) - 40 points total
  -- ============================================

  -- 1. Tenant name present (5 points)
  IF tenant_record.name IS NOT NULL AND length(trim(tenant_record.name)) > 2 THEN
    score := score + 5;
  ELSE
    p0_flags := array_append(p0_flags, 'missing_business_name');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Add your business name',
      'deep_link', '/app/settings'
    ));
  END IF;

  -- 2. Timezone present (5 points)
  IF tenant_record.timezone IS NOT NULL AND length(tenant_record.timezone) > 0 THEN
    score := score + 5;
  ELSE
    p0_flags := array_append(p0_flags, 'missing_timezone');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Set your timezone',
      'deep_link', '/app/settings'
    ));
  END IF;

  -- 3. Hours configured (10 points)
  IF tenant_record.hours_json IS NOT NULL 
     AND jsonb_typeof(tenant_record.hours_json) = 'object'
     AND (
       tenant_record.hours_json ? 'monday' OR 
       tenant_record.hours_json ? 'tuesday' OR 
       tenant_record.hours_json ? 'wednesday'
     ) THEN
    score := score + 10;
  ELSE
    p0_flags := array_append(p0_flags, 'missing_hours');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Configure business hours',
      'deep_link', '/app/business-brain?section=hours'
    ));
  END IF;

  -- 4. Policies present (10 points)
  IF (tenant_record.cancellation_policy IS NOT NULL AND length(tenant_record.cancellation_policy) > 10)
     OR (tenant_record.ai_policies_json IS NOT NULL AND jsonb_typeof(tenant_record.ai_policies_json) = 'object')
  THEN
    score := score + 10;
  ELSE
    p1_flags := array_append(p1_flags, 'missing_policies');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Add business policies',
      'deep_link', '/app/business-brain?section=policies'
    ));
  END IF;

  -- 5. FAQs >= 5 (10 points)
  IF faqs_count >= 5 THEN
    score := score + 10;
  ELSIF faqs_count >= 2 THEN
    score := score + 5;
    p1_flags := array_append(p1_flags, 'few_faqs');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Add more FAQs (need 5+)',
      'deep_link', '/app/business-brain?section=knowledge'
    ));
  ELSE
    p0_flags := array_append(p0_flags, 'missing_faqs');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Add at least 5 FAQs',
      'deep_link', '/app/business-brain?section=knowledge'
    ));
  END IF;

  -- ============================================
  -- MODE-SPECIFIC CHECKS - 60 points total
  -- ============================================

  CASE business_mode
  -- ============================================
  -- SERVICE MODE
  -- ============================================
  WHEN 'service' THEN
    -- Services count >= 3 (15 points)
    IF services_count >= 3 THEN
      score := score + 15;
    ELSIF services_count >= 1 THEN
      score := score + 5;
      p0_flags := array_append(p0_flags, 'few_services');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add at least 3 services',
        'deep_link', '/app/business-brain?section=services'
      ));
    ELSE
      p0_flags := array_append(p0_flags, 'no_services');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add your services',
        'deep_link', '/app/business-brain?section=services'
      ));
    END IF;

    -- Service pricing configured (10 points)
    IF EXISTS (SELECT 1 FROM services WHERE tenant_id = tenant_uuid AND price_type IS NOT NULL AND is_active = true) THEN
      score := score + 10;
    ELSE
      p0_flags := array_append(p0_flags, 'missing_pricing');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Set prices for services',
        'deep_link', '/app/business-brain?section=services'
      ));
    END IF;

    -- Booking mode configured (15 points)
    IF booking_mode_value IS NOT NULL AND length(trim(booking_mode_value)) > 0 THEN
      score := score + 15;
    ELSE
      p0_flags := array_append(p0_flags, 'missing_booking_mode');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Configure booking mode',
        'deep_link', '/app/business-brain?section=availability'
      ));
    END IF;

    -- Intake fields include name + phone (10 points)
    IF intake_fields @> '[{"key": "name"}]'::jsonb OR intake_fields @> '[{"key": "customer_name"}]'::jsonb THEN
      score := score + 5;
    ELSE
      p1_flags := array_append(p1_flags, 'missing_name_intake');
    END IF;

    IF intake_fields @> '[{"key": "phone"}]'::jsonb OR intake_fields @> '[{"key": "customer_phone"}]'::jsonb THEN
      score := score + 5;
    ELSE
      p1_flags := array_append(p1_flags, 'missing_phone_intake');
    END IF;

    -- Service area (10 points)
    IF tenant_record.service_area_json IS NOT NULL AND jsonb_typeof(tenant_record.service_area_json) = 'object' THEN
      score := score + 10;
    ELSE
      p1_flags := array_append(p1_flags, 'missing_service_area');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Define service area',
        'deep_link', '/app/business-brain?section=service-area'
      ));
    END IF;

  -- ============================================
  -- FOOD MODE
  -- ============================================
  WHEN 'food' THEN
    -- Menu items >= 10 (20 points)
    IF menu_items_count >= 10 THEN
      score := score + 20;
    ELSIF menu_items_count >= 5 THEN
      score := score + 10;
      p0_flags := array_append(p0_flags, 'few_menu_items');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add at least 10 menu items',
        'deep_link', '/app/menu-center'
      ));
    ELSIF menu_items_count >= 1 THEN
      score := score + 5;
      p0_flags := array_append(p0_flags, 'few_menu_items');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add at least 10 menu items',
        'deep_link', '/app/menu-center'
      ));
    ELSE
      p0_flags := array_append(p0_flags, 'no_menu_items');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add your menu items',
        'deep_link', '/app/menu-center'
      ));
    END IF;

    -- Ordering enabled (pickup OR delivery) (20 points)
    IF food_settings ? 'pickup_enabled' OR food_settings ? 'delivery_enabled' THEN
      IF (food_settings->>'pickup_enabled')::boolean = true OR (food_settings->>'delivery_enabled')::boolean = true THEN
        score := score + 20;
      ELSE
        p0_flags := array_append(p0_flags, 'ordering_disabled');
        recommendations := recommendations || jsonb_build_array(jsonb_build_object(
          'label', 'Enable pickup or delivery',
          'deep_link', '/app/settings'
        ));
      END IF;
    ELSE
      score := score + 10;
      p1_flags := array_append(p1_flags, 'ordering_not_configured');
    END IF;

    -- Special instructions enabled (10 points)
    IF food_settings ? 'special_instructions_enabled' THEN
      IF (food_settings->>'special_instructions_enabled')::boolean = true THEN
        score := score + 10;
      END IF;
    ELSE
      score := score + 10;
    END IF;

    -- Menu pricing (10 points)
    IF EXISTS (SELECT 1 FROM menu_items WHERE tenant_id = tenant_uuid AND price_cents > 0 AND is_available = true) THEN
      score := score + 10;
    ELSE
      p0_flags := array_append(p0_flags, 'missing_menu_prices');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add prices to menu items',
        'deep_link', '/app/menu-center'
      ));
    END IF;

  -- ============================================
  -- DISPATCH MODE
  -- ============================================
  WHEN 'dispatch' THEN
    -- Service area defined (20 points)
    IF tenant_record.service_area_json IS NOT NULL AND jsonb_typeof(tenant_record.service_area_json) = 'object' THEN
      score := score + 20;
    ELSE
      p0_flags := array_append(p0_flags, 'missing_service_area');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Define service area',
        'deep_link', '/app/business-brain?section=service-area'
      ));
    END IF;

    -- Intake includes pickup_address (15 points)
    IF intake_fields::text ILIKE '%pickup%' OR intake_fields::text ILIKE '%address%' THEN
      score := score + 15;
    ELSE
      p0_flags := array_append(p0_flags, 'missing_pickup_intake');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add pickup address to intake',
        'deep_link', '/app/settings'
      ));
    END IF;

    -- Intake includes vehicle_type (10 points)
    IF intake_fields::text ILIKE '%vehicle%' THEN
      score := score + 10;
    ELSE
      p1_flags := array_append(p1_flags, 'missing_vehicle_intake');
    END IF;

    -- Intake includes urgency (10 points)
    IF intake_fields::text ILIKE '%urgency%' OR intake_fields::text ILIKE '%priority%' THEN
      score := score + 10;
    ELSE
      p1_flags := array_append(p1_flags, 'missing_urgency_intake');
    END IF;

    -- Some services/dispatch types defined (5 points)
    IF services_count >= 1 THEN
      score := score + 5;
    ELSE
      p1_flags := array_append(p1_flags, 'no_dispatch_services');
    END IF;

  -- ============================================
  -- MEDICAL MODE
  -- ============================================
  WHEN 'medical' THEN
    -- HIPAA mode enabled (20 points)
    IF tenant_record.hipaa_mode = true THEN
      score := score + 20;
    ELSE
      p0_flags := array_append(p0_flags, 'hipaa_disabled');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Enable HIPAA compliance mode',
        'deep_link', '/app/settings#hipaa'
      ));
    END IF;

    -- Data retention settings exist (15 points)
    IF has_data_retention THEN
      score := score + 15;
      IF data_retention_record.store_transcripts = false AND data_retention_record.store_recordings = false THEN
        score := score + 5;
      ELSE
        p1_flags := array_append(p1_flags, 'hipaa_storage_warning');
      END IF;
    ELSE
      p0_flags := array_append(p0_flags, 'missing_data_retention');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Configure data retention settings',
        'deep_link', '/app/settings#hipaa'
      ));
    END IF;

    -- Services defined (10 points)
    IF services_count >= 1 THEN
      score := score + 10;
    ELSE
      p0_flags := array_append(p0_flags, 'no_medical_services');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add appointment types',
        'deep_link', '/app/business-brain?section=services'
      ));
    END IF;

    -- Booking mode (10 points)
    IF booking_mode_value IS NOT NULL AND length(trim(booking_mode_value)) > 0 THEN
      score := score + 10;
    ELSE
      p1_flags := array_append(p1_flags, 'missing_booking_mode');
    END IF;

  -- ============================================
  -- GENERAL MODE
  -- ============================================
  ELSE
    IF has_assistant THEN
      score := score + 30;
    END IF;
    score := score + 30;
  END CASE;

  -- Cap score at 100
  IF score > 100 THEN
    score := 100;
  END IF;

  -- Build result
  result := jsonb_build_object(
    'score', score,
    'p0_flags', to_jsonb(p0_flags),
    'p1_flags', to_jsonb(p1_flags),
    'recommendations', recommendations,
    'last_computed_at', now(),
    'business_mode', business_mode
  );

  -- Update cache in assistant_settings
  IF has_assistant THEN
    UPDATE assistant_settings SET
      readiness_score = score,
      readiness_p0_flags = to_jsonb(p0_flags),
      readiness_p1_flags = to_jsonb(p1_flags),
      readiness_recommendations = recommendations,
      readiness_last_computed_at = now()
    WHERE tenant_id = tenant_uuid;
  END IF;

  RETURN result;
END;
$$;

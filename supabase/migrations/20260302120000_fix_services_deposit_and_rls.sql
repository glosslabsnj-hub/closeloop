-- Fix multiple QA-reported bugs:
-- 1. Add deposit_amount column to services table (was referenced in code but never created)
-- 2. Add missing RLS policies for leads table (booking creation fails with 42501)
-- 3. Add missing RLS policies for bookings table
-- 4. Improve AI readiness scoring (remove misleading auto-awards)

-- ============================================================================
-- 1. Add deposit_amount to services table
-- ============================================================================
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT NULL;
COMMENT ON COLUMN public.services.deposit_amount IS 'Per-service deposit amount in dollars (e.g., 50.00)';

-- ============================================================================
-- 2. RLS policies for leads table (RLS enabled but NO policies existed)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view tenant leads" ON public.leads;
CREATE POLICY "Users can view tenant leads"
  ON public.leads FOR SELECT
  USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Users can insert tenant leads" ON public.leads;
CREATE POLICY "Users can insert tenant leads"
  ON public.leads FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Users can update tenant leads" ON public.leads;
CREATE POLICY "Users can update tenant leads"
  ON public.leads FOR UPDATE
  USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Users can delete tenant leads" ON public.leads;
CREATE POLICY "Users can delete tenant leads"
  ON public.leads FOR DELETE
  USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "service_role_full_leads" ON public.leads;
CREATE POLICY "service_role_full_leads"
  ON public.leads FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. RLS policies for bookings table (RLS enabled but NO policies existed)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view tenant bookings" ON public.bookings;
CREATE POLICY "Users can view tenant bookings"
  ON public.bookings FOR SELECT
  USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Users can insert tenant bookings" ON public.bookings;
CREATE POLICY "Users can insert tenant bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Users can update tenant bookings" ON public.bookings;
CREATE POLICY "Users can update tenant bookings"
  ON public.bookings FOR UPDATE
  USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Users can delete tenant bookings" ON public.bookings;
CREATE POLICY "Users can delete tenant bookings"
  ON public.bookings FOR DELETE
  USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "service_role_full_bookings" ON public.bookings;
CREATE POLICY "service_role_full_bookings"
  ON public.bookings FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. RLS policies for conversations table (same issue)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view tenant conversations" ON public.conversations;
CREATE POLICY "Users can view tenant conversations"
  ON public.conversations FOR SELECT
  USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Users can manage tenant conversations" ON public.conversations;
CREATE POLICY "Users can manage tenant conversations"
  ON public.conversations FOR ALL
  USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "service_role_full_conversations" ON public.conversations;
CREATE POLICY "service_role_full_conversations"
  ON public.conversations FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. RLS policies for messages table (same issue)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view tenant messages" ON public.messages;
CREATE POLICY "Users can view tenant messages"
  ON public.messages FOR SELECT
  USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Users can manage tenant messages" ON public.messages;
CREATE POLICY "Users can manage tenant messages"
  ON public.messages FOR ALL
  USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

DROP POLICY IF EXISTS "service_role_full_messages" ON public.messages;
CREATE POLICY "service_role_full_messages"
  ON public.messages FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. Improve AI Readiness scoring - remove misleading auto-awards
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_ai_readiness(tenant_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  tenant_record record;
  assistant_record record;
  has_assistant boolean := false;
  services_count integer;
  quality_services_count integer;
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

  -- Fetch assistant settings
  SELECT * INTO assistant_record FROM assistant_settings WHERE tenant_id = tenant_uuid;
  has_assistant := FOUND;

  IF has_assistant THEN
    booking_mode_value := assistant_record.ai_booking_mode;
  ELSE
    booking_mode_value := NULL;
  END IF;

  -- Get counts
  SELECT COUNT(*) INTO services_count FROM services WHERE tenant_id = tenant_uuid AND is_active = true;
  -- Quality services: have a description longer than 15 chars (not just "Sample service #1")
  SELECT COUNT(*) INTO quality_services_count FROM services
    WHERE tenant_id = tenant_uuid AND is_active = true
    AND description IS NOT NULL AND length(trim(description)) > 15
    AND name NOT LIKE 'Service %';
  SELECT COUNT(*) INTO menu_items_count FROM menu_items WHERE tenant_id = tenant_uuid AND is_available = true;
  SELECT COUNT(*) INTO faqs_count FROM business_faqs WHERE tenant_id = tenant_uuid;

  SELECT * INTO data_retention_record FROM data_retention_settings WHERE tenant_id = tenant_uuid;
  has_data_retention := FOUND;

  business_mode := COALESCE(tenant_record.business_mode::text, 'service');
  intake_fields := COALESCE(tenant_record.context_fields_json, '{}'::jsonb);
  food_settings := COALESCE(tenant_record.food_settings, '{}'::jsonb);

  -- ============================================
  -- GLOBAL CHECKS (ALL MODES) - 40 points
  -- ============================================

  -- 1. Business name (5 pts)
  IF tenant_record.name IS NOT NULL AND length(trim(tenant_record.name)) > 2 THEN
    score := score + 5;
  ELSE
    p0_flags := array_append(p0_flags, 'missing_business_name');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Add your business name', 'deep_link', '/app/settings'));
  END IF;

  -- 2. Timezone (5 pts)
  IF tenant_record.timezone IS NOT NULL AND length(tenant_record.timezone) > 0 THEN
    score := score + 5;
  ELSE
    p0_flags := array_append(p0_flags, 'missing_timezone');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Set your timezone', 'deep_link', '/app/settings'));
  END IF;

  -- 3. Hours (10 pts)
  IF tenant_record.hours_json IS NOT NULL
     AND jsonb_typeof(tenant_record.hours_json) = 'object'
     AND (tenant_record.hours_json ? 'monday' OR tenant_record.hours_json ? 'tuesday' OR tenant_record.hours_json ? 'wednesday')
  THEN
    score := score + 10;
  ELSE
    p0_flags := array_append(p0_flags, 'missing_hours');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Configure business hours', 'deep_link', '/app/business-brain?section=hours'));
  END IF;

  -- 4. Policies (10 pts)
  IF (tenant_record.cancellation_policy IS NOT NULL AND length(tenant_record.cancellation_policy) > 10)
     OR (tenant_record.ai_policies_json IS NOT NULL AND jsonb_typeof(tenant_record.ai_policies_json) = 'object')
  THEN
    score := score + 10;
  ELSE
    p1_flags := array_append(p1_flags, 'missing_policies');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Add business policies', 'deep_link', '/app/business-brain?section=policies'));
  END IF;

  -- 5. FAQs (10 pts)
  IF faqs_count >= 5 THEN
    score := score + 10;
  ELSIF faqs_count >= 2 THEN
    score := score + 5;
    p1_flags := array_append(p1_flags, 'few_faqs');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Add more FAQs (need 5+)', 'deep_link', '/app/business-brain?section=knowledge'));
  ELSE
    p0_flags := array_append(p0_flags, 'missing_faqs');
    recommendations := recommendations || jsonb_build_array(jsonb_build_object(
      'label', 'Add at least 5 FAQs', 'deep_link', '/app/business-brain?section=knowledge'));
  END IF;

  -- ============================================
  -- MODE-SPECIFIC CHECKS - 60 points
  -- ============================================

  CASE business_mode
  WHEN 'service' THEN
    -- Services (15 pts) — require quality services (non-placeholder)
    IF quality_services_count >= 3 THEN
      score := score + 15;
    ELSIF quality_services_count >= 1 THEN
      score := score + 5;
      p0_flags := array_append(p0_flags, 'few_services');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add at least 3 services with descriptions', 'deep_link', '/app/business-brain?section=services'));
    ELSIF services_count >= 1 THEN
      -- Has services but they're placeholders
      score := score + 2;
      p0_flags := array_append(p0_flags, 'placeholder_services');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Update service names and descriptions (currently generic)', 'deep_link', '/app/business-brain?section=services'));
    ELSE
      p0_flags := array_append(p0_flags, 'no_services');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add your services', 'deep_link', '/app/business-brain?section=services'));
    END IF;

    -- Pricing (10 pts) — require actual price amounts, not just price_type
    IF EXISTS (SELECT 1 FROM services WHERE tenant_id = tenant_uuid AND price_amount IS NOT NULL AND price_amount > 0 AND is_active = true) THEN
      score := score + 10;
    ELSIF EXISTS (SELECT 1 FROM services WHERE tenant_id = tenant_uuid AND price_type IS NOT NULL AND is_active = true) THEN
      score := score + 5;
      p1_flags := array_append(p1_flags, 'missing_price_amounts');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add prices to your services', 'deep_link', '/app/business-brain?section=services'));
    ELSE
      p0_flags := array_append(p0_flags, 'missing_pricing');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Set prices for services', 'deep_link', '/app/business-brain?section=services'));
    END IF;

    -- Booking mode (15 pts)
    IF booking_mode_value IS NOT NULL AND length(trim(booking_mode_value)) > 0 THEN
      score := score + 15;
    ELSE
      p0_flags := array_append(p0_flags, 'missing_booking_mode');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Configure booking mode', 'deep_link', '/app/business-brain?section=availability'));
    END IF;

    -- AI greeting configured (10 pts) — replaces the auto-award
    IF has_assistant AND assistant_record.greeting_script IS NOT NULL AND length(trim(assistant_record.greeting_script)) > 10 THEN
      score := score + 10;
    ELSIF has_assistant THEN
      score := score + 5;
      p1_flags := array_append(p1_flags, 'generic_greeting');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Customize AI greeting', 'deep_link', '/app/business-brain?section=ai-behavior'));
    ELSE
      p1_flags := array_append(p1_flags, 'missing_greeting');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Set up AI greeting', 'deep_link', '/app/business-brain?section=ai-behavior'));
    END IF;

    -- Service area (10 pts)
    IF tenant_record.service_area_json IS NOT NULL AND jsonb_typeof(tenant_record.service_area_json) = 'object' THEN
      score := score + 10;
    ELSE
      p1_flags := array_append(p1_flags, 'missing_service_area');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Define service area', 'deep_link', '/app/business-brain?section=service-area'));
    END IF;

  WHEN 'food' THEN
    -- Menu items (20 pts)
    IF menu_items_count >= 10 THEN
      score := score + 20;
    ELSIF menu_items_count >= 5 THEN
      score := score + 10;
      p0_flags := array_append(p0_flags, 'few_menu_items');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add at least 10 menu items', 'deep_link', '/app/menu-center'));
    ELSIF menu_items_count >= 1 THEN
      score := score + 5;
      p0_flags := array_append(p0_flags, 'few_menu_items');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add at least 10 menu items', 'deep_link', '/app/menu-center'));
    ELSE
      p0_flags := array_append(p0_flags, 'no_menu_items');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add your menu items', 'deep_link', '/app/menu-center'));
    END IF;

    -- Ordering (20 pts)
    IF food_settings ? 'pickup_enabled' OR food_settings ? 'delivery_enabled' THEN
      IF (food_settings->>'pickup_enabled')::boolean = true OR (food_settings->>'delivery_enabled')::boolean = true THEN
        score := score + 20;
      ELSE
        p0_flags := array_append(p0_flags, 'ordering_disabled');
        recommendations := recommendations || jsonb_build_array(jsonb_build_object(
          'label', 'Enable pickup or delivery', 'deep_link', '/app/settings'));
      END IF;
    ELSE
      score := score + 10;
      p1_flags := array_append(p1_flags, 'ordering_not_configured');
    END IF;

    -- Special instructions (10 pts)
    IF food_settings ? 'special_instructions_enabled' THEN
      score := score + 10;
    ELSE
      score := score + 5;
      p1_flags := array_append(p1_flags, 'missing_food_instructions');
    END IF;

    -- Menu prices (10 pts)
    IF EXISTS (SELECT 1 FROM menu_items WHERE tenant_id = tenant_uuid AND price_cents > 0 AND is_available = true) THEN
      score := score + 10;
    ELSE
      p0_flags := array_append(p0_flags, 'missing_menu_prices');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add prices to menu items', 'deep_link', '/app/menu-center'));
    END IF;

  WHEN 'dispatch' THEN
    -- Dispatch services (20 pts)
    IF services_count >= 1 THEN
      score := score + 20;
    ELSE
      p0_flags := array_append(p0_flags, 'no_dispatch_services');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add dispatch services', 'deep_link', '/app/business-brain?section=services'));
    END IF;

    -- Service area (15 pts)
    IF tenant_record.service_area_json IS NOT NULL AND jsonb_typeof(tenant_record.service_area_json) = 'object' THEN
      score := score + 15;
    ELSE
      p0_flags := array_append(p0_flags, 'missing_service_area');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Define service area', 'deep_link', '/app/business-brain?section=service-area'));
    END IF;

    -- AI greeting (15 pts) — replaces auto-award
    IF has_assistant AND assistant_record.greeting_script IS NOT NULL AND length(trim(assistant_record.greeting_script)) > 10 THEN
      score := score + 15;
    ELSIF has_assistant THEN
      score := score + 7;
      p1_flags := array_append(p1_flags, 'generic_greeting');
    ELSE
      p1_flags := array_append(p1_flags, 'missing_greeting');
    END IF;

    -- Pricing (10 pts)
    IF tenant_record.pricing_rules_jsonb IS NOT NULL
       AND jsonb_typeof(tenant_record.pricing_rules_jsonb) = 'object'
       AND tenant_record.pricing_rules_jsonb != '{}'::jsonb
    THEN
      score := score + 10;
    ELSE
      p1_flags := array_append(p1_flags, 'missing_dispatch_pricing');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Configure pricing', 'deep_link', '/app/business-brain?section=services'));
    END IF;

  WHEN 'medical' THEN
    -- HIPAA mode (15 pts)
    IF tenant_record.hipaa_mode = true THEN
      score := score + 15;
    ELSE
      p0_flags := array_append(p0_flags, 'hipaa_disabled');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Enable HIPAA mode', 'deep_link', '/app/settings'));
    END IF;

    -- Appointment types (15 pts)
    IF services_count >= 1 THEN
      score := score + 15;
    ELSE
      p0_flags := array_append(p0_flags, 'no_medical_services');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add appointment types', 'deep_link', '/app/business-brain?section=services'));
    END IF;

    -- Data retention (15 pts)
    IF has_data_retention THEN
      score := score + 15;
    ELSE
      p0_flags := array_append(p0_flags, 'missing_data_retention');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Set data retention rules', 'deep_link', '/app/settings'));
    END IF;

    -- HIPAA storage check (15 pts)
    IF tenant_record.hipaa_mode = true AND has_data_retention THEN
      score := score + 15;
    ELSIF tenant_record.hipaa_mode = true THEN
      p1_flags := array_append(p1_flags, 'hipaa_storage_warning');
    ELSE
      score := score + 15;
    END IF;

  WHEN 'general' THEN
    -- Services optional but encouraged (20 pts)
    IF services_count >= 1 THEN
      score := score + 20;
    ELSE
      score := score + 10;
      p1_flags := array_append(p1_flags, 'no_services');
    END IF;

    -- Greeting configured (20 pts)
    IF has_assistant AND assistant_record.greeting_script IS NOT NULL AND length(trim(assistant_record.greeting_script)) > 5 THEN
      score := score + 20;
    ELSE
      score := score + 5;
      p1_flags := array_append(p1_flags, 'missing_greeting');
    END IF;

    -- Callback config (20 pts) — check actual booking mode instead of auto-awarding
    IF booking_mode_value IS NOT NULL AND length(trim(booking_mode_value)) > 0 THEN
      score := score + 20;
    ELSE
      score := score + 10;
      p1_flags := array_append(p1_flags, 'missing_booking_mode');
    END IF;

  WHEN 'sales' THEN
    -- Sales pipeline (20 pts)
    IF services_count >= 1 THEN
      score := score + 20;
    ELSE
      p0_flags := array_append(p0_flags, 'no_sales_services');
      recommendations := recommendations || jsonb_build_array(jsonb_build_object(
        'label', 'Add services/products', 'deep_link', '/app/business-brain?section=services'));
    END IF;

    -- Lead qualification (20 pts)
    IF has_assistant AND assistant_record.greeting_script IS NOT NULL THEN
      score := score + 20;
    ELSE
      score := score + 5;
      p1_flags := array_append(p1_flags, 'missing_lead_qual');
    END IF;

    -- CRM setup (20 pts)
    IF booking_mode_value IS NOT NULL THEN
      score := score + 20;
    ELSE
      score := score + 10;
      p1_flags := array_append(p1_flags, 'missing_crm_config');
    END IF;

  ELSE
    -- Unknown mode, give partial credit
    score := score + 30;
  END CASE;

  -- Cap score at 100
  IF score > 100 THEN score := 100; END IF;

  -- Build result
  result := jsonb_build_object(
    'score', score,
    'p0_flags', to_jsonb(p0_flags),
    'p1_flags', to_jsonb(p1_flags),
    'recommendations', recommendations,
    'last_computed_at', now()::text,
    'business_mode', business_mode
  );

  -- Cache result in assistant_settings (if row exists)
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
$function$;

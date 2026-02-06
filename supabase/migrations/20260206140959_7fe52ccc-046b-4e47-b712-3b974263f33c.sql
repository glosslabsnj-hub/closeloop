-- Create 5 test tenants (one per business_mode) with active subscriptions
-- Link to super admin via tenant_users
-- Ensure admin test line exists

DO $$
DECLARE
  v_admin_user_id uuid;
  v_tenant_id uuid;
  v_modes text[] := ARRAY['service', 'dispatch', 'food', 'medical', 'general'];
  v_mode text;
  v_tenant_name text;
  v_industry text;
  v_modules jsonb;
BEGIN
  -- Find super admin user
  SELECT user_id INTO v_admin_user_id
  FROM user_roles
  WHERE role = 'super_admin'
  LIMIT 1;

  IF v_admin_user_id IS NULL THEN
    RAISE NOTICE 'No super admin found, skipping test tenant creation';
    RETURN;
  END IF;

  -- Create tenants for each business mode
  FOREACH v_mode IN ARRAY v_modes LOOP
    -- Set tenant name, industry, and modules based on mode
    CASE v_mode
      WHEN 'service' THEN
        v_tenant_name := 'Test Service Business';
        v_industry := 'detailing';
        v_modules := '["ai_voice", "instant_text_back", "booking"]'::jsonb;
      WHEN 'dispatch' THEN
        v_tenant_name := 'City Roadside Rescue';
        v_industry := 'towing';
        v_modules := '["ai_voice", "instant_text_back", "dispatch_queue"]'::jsonb;
      WHEN 'food' THEN
        v_tenant_name := 'Test Restaurant';
        v_industry := 'restaurant';
        v_modules := '["ai_voice", "instant_text_back", "food_orders", "reservations", "catering", "menu_knowledge"]'::jsonb;
      WHEN 'medical' THEN
        v_tenant_name := 'Sunrise Family Medicine';
        v_industry := 'medical';
        v_modules := '["ai_voice", "instant_text_back", "booking", "medical_intake"]'::jsonb;
      WHEN 'general' THEN
        v_tenant_name := 'Main Street Office';
        v_industry := 'general';
        v_modules := '["ai_voice", "instant_text_back"]'::jsonb;
    END CASE;

    -- Check if tenant already exists by name
    SELECT id INTO v_tenant_id
    FROM tenants
    WHERE name = v_tenant_name
    LIMIT 1;

    -- Create tenant if not exists
    IF v_tenant_id IS NULL THEN
      INSERT INTO tenants (name, industry, business_mode, enabled_modules, timezone)
      VALUES (
        v_tenant_name,
        v_industry,
        v_mode::business_mode,
        v_modules,
        'America/New_York'
      )
      RETURNING id INTO v_tenant_id;

      RAISE NOTICE 'Created tenant: % (mode: %)', v_tenant_name, v_mode;
    ELSE
      -- Update existing tenant to ensure correct mode
      UPDATE tenants
      SET business_mode = v_mode::business_mode,
          enabled_modules = v_modules
      WHERE id = v_tenant_id;

      RAISE NOTICE 'Updated existing tenant: % (mode: %)', v_tenant_name, v_mode;
    END IF;

    -- Link admin to tenant
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (v_tenant_id, v_admin_user_id, 'owner')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;

    -- Create active subscription
    INSERT INTO subscriptions (tenant_id, plan_code, status, included_minutes, current_period_end)
    VALUES (v_tenant_id, 'voice-200', 'active', 200, NOW() + INTERVAL '1 year')
    ON CONFLICT (tenant_id) DO UPDATE SET
      status = 'active',
      current_period_end = GREATEST(subscriptions.current_period_end, NOW() + INTERVAL '1 year');

    -- Create assistant_settings if not exists
    INSERT INTO assistant_settings (tenant_id)
    VALUES (v_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;

  END LOOP;

  -- Ensure admin test line exists
  INSERT INTO phone_numbers (
    phone_e164,
    tenant_id,
    location_id,
    purpose,
    status,
    is_admin_test_line
  )
  SELECT
    '+18553297357',
    (SELECT id FROM tenants WHERE name = 'City Roadside Rescue' LIMIT 1),
    NULL,
    'admin_test',
    'provisioned',
    true
  WHERE NOT EXISTS (
    SELECT 1 FROM phone_numbers WHERE phone_e164 = '+18553297357'
  );

  -- Update existing record if needed
  UPDATE phone_numbers
  SET is_admin_test_line = true,
      status = 'provisioned',
      purpose = 'admin_test'
  WHERE phone_e164 = '+18553297357';

  RAISE NOTICE 'Admin test line +18553297357 configured';
END $$;
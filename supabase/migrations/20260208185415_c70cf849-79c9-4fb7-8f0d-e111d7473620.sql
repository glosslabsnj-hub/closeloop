-- Create migration function
CREATE OR REPLACE FUNCTION migrate_tenant_to_capabilities(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant RECORD;
  v_caps JSONB := '{}';
  v_module TEXT;
BEGIN
  SELECT business_mode, enabled_modules, hipaa_mode 
  INTO v_tenant 
  FROM tenants 
  WHERE id = p_tenant_id;
  
  IF v_tenant IS NULL THEN
    RETURN '{}';
  END IF;
  
  IF v_tenant.enabled_modules IS NOT NULL AND jsonb_typeof(v_tenant.enabled_modules) = 'array' THEN
    FOR v_module IN SELECT jsonb_array_elements_text(v_tenant.enabled_modules)
    LOOP
      v_caps := v_caps || jsonb_build_object(v_module, true);
    END LOOP;
  END IF;
  
  CASE v_tenant.business_mode
    WHEN 'dispatch' THEN
      v_caps := v_caps || jsonb_build_object(
        'dispatch_queue', COALESCE((v_caps->>'dispatch_queue')::boolean, true),
        'distance_pricing', COALESCE((v_caps->>'distance_pricing')::boolean, true),
        'emergency_dispatch', COALESCE((v_caps->>'emergency_dispatch')::boolean, true),
        'mobile_service', COALESCE((v_caps->>'mobile_service')::boolean, true)
      );
    WHEN 'food' THEN
      v_caps := v_caps || jsonb_build_object(
        'food_orders', COALESCE((v_caps->>'food_orders')::boolean, true),
        'menu_knowledge', COALESCE((v_caps->>'menu_knowledge')::boolean, true),
        'pickup', COALESCE((v_caps->>'pickup')::boolean, true)
      );
    WHEN 'medical' THEN
      v_caps := v_caps || jsonb_build_object(
        'booking', COALESCE((v_caps->>'booking')::boolean, true),
        'medical_intake', COALESCE((v_caps->>'medical_intake')::boolean, true),
        'hipaa_compliance', COALESCE(v_tenant.hipaa_mode, true)
      );
    WHEN 'service' THEN
      v_caps := v_caps || jsonb_build_object(
        'booking', COALESCE((v_caps->>'booking')::boolean, true),
        'calendar_sync', COALESCE((v_caps->>'calendar_sync')::boolean, true)
      );
    ELSE
      v_caps := v_caps || jsonb_build_object(
        'callbacks', COALESCE((v_caps->>'callbacks')::boolean, true)
      );
  END CASE;
  
  v_caps := v_caps || jsonb_build_object(
    'ai_voice', COALESCE((v_caps->>'ai_voice')::boolean, true),
    'instant_text_back', COALESCE((v_caps->>'instant_text_back')::boolean, true)
  );
  
  RETURN v_caps;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Migrate all existing tenants
UPDATE tenants
SET capabilities_json = migrate_tenant_to_capabilities(id)
WHERE capabilities_json = '{}' OR capabilities_json IS NULL;

-- Cleanup the migration function
DROP FUNCTION IF EXISTS migrate_tenant_to_capabilities(UUID);
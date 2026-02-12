ALTER TABLE assistant_settings
  ADD COLUMN IF NOT EXISTS ai_behavior_mode text DEFAULT 'full_service';

UPDATE assistant_settings
  SET ai_behavior_mode = 'callback_only'
  WHERE tenant_id IN (
    SELECT id FROM tenants
    WHERE capabilities_json->>'callbackOnly' = 'true'
  );
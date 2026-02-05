-- Add 'lead_recovery' as valid source_type for revenue_attributions
ALTER TABLE revenue_attributions DROP CONSTRAINT revenue_attributions_source_type_check;
ALTER TABLE revenue_attributions ADD CONSTRAINT revenue_attributions_source_type_check 
  CHECK (source_type = ANY (ARRAY['ai_call'::text, 'manual'::text, 'web_form'::text, 'lead_recovery'::text]));
-- Add 'lead_recovery' as valid entity_type for revenue_attributions
ALTER TABLE revenue_attributions DROP CONSTRAINT revenue_attributions_entity_type_check;
ALTER TABLE revenue_attributions ADD CONSTRAINT revenue_attributions_entity_type_check 
  CHECK (entity_type = ANY (ARRAY['booking'::text, 'dispatch_job'::text, 'food_order'::text, 'lead_recovery'::text]));

-- Add 'lead.recovered' to audit_event_type enum
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'lead.recovered';
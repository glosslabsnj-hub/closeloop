-- Add per-service required intake fields
-- AI agent uses these to know which questions are mandatory before booking each service
ALTER TABLE services ADD COLUMN IF NOT EXISTS required_intake_fields jsonb DEFAULT '[]';

-- Example value: ["address", "property_type", "urgency", "budget_range"]
COMMENT ON COLUMN services.required_intake_fields IS 'List of field names the AI must collect before booking this service';

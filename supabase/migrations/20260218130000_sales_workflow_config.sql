-- Sales Workflow Configuration
-- Adds sales-specific columns to general_workflow_config table
-- These control how the Sales Agent behaves during calls

ALTER TABLE general_workflow_config
  ADD COLUMN IF NOT EXISTS sales_pricing_strategy text DEFAULT 'deflect_to_visit',
  ADD COLUMN IF NOT EXISTS sales_ask_trade_in boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sales_ask_financing boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sales_ask_timeline boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sales_ask_budget text DEFAULT 'careful',
  ADD COLUMN IF NOT EXISTS sales_max_vehicles_to_mention integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS sales_appointment_label text DEFAULT 'test drive',
  ADD COLUMN IF NOT EXISTS sales_push_intensity text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS sales_follow_up_script text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sales_lead_capture_minimum text DEFAULT 'name_phone_interest',
  ADD COLUMN IF NOT EXISTS sales_inventory_presentation text DEFAULT 'conversational';

-- Add comments for documentation
COMMENT ON COLUMN general_workflow_config.sales_pricing_strategy IS 'How AI handles pricing: deflect_to_visit, give_range, give_exact';
COMMENT ON COLUMN general_workflow_config.sales_ask_trade_in IS 'Whether AI asks about trade-ins during qualification';
COMMENT ON COLUMN general_workflow_config.sales_ask_financing IS 'Whether AI asks about financing during qualification';
COMMENT ON COLUMN general_workflow_config.sales_ask_timeline IS 'Whether AI asks about purchase timeline';
COMMENT ON COLUMN general_workflow_config.sales_ask_budget IS 'When AI asks about budget: always, careful, never';
COMMENT ON COLUMN general_workflow_config.sales_max_vehicles_to_mention IS 'Max inventory items to describe per response';
COMMENT ON COLUMN general_workflow_config.sales_appointment_label IS 'Label for appointments: test drive, showing, demo, consultation, site visit';
COMMENT ON COLUMN general_workflow_config.sales_push_intensity IS 'How hard to push for appointment: soft, medium, assertive';
COMMENT ON COLUMN general_workflow_config.sales_follow_up_script IS 'Custom follow-up script for callbacks';
COMMENT ON COLUMN general_workflow_config.sales_lead_capture_minimum IS 'Minimum info: name_phone, name_phone_interest, name_phone_interest_timeline';
COMMENT ON COLUMN general_workflow_config.sales_inventory_presentation IS 'Inventory style: conversational, list_format, highlight_best_match';

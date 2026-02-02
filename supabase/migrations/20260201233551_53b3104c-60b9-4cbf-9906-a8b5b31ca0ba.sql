-- Add 'required_inputs' to the intent_rule_type enum
ALTER TYPE intent_rule_type ADD VALUE IF NOT EXISTS 'required_inputs';
-- Add 'required_inputs' to intent_rule_type enum
ALTER TYPE intent_rule_type ADD VALUE IF NOT EXISTS 'required_inputs';

-- Comment explaining the structure for required_inputs rules
COMMENT ON TYPE intent_rule_type IS 'Types of business intent rules. required_inputs rules store per-intent input requirements in action_json: { intent: string, required_inputs: [{key, label, ask_prompt, why_needed}], optional_inputs: [{key, label, ask_prompt, why_needed}] }';

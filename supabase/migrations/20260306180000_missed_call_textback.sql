-- Add missed-call text-back settings to assistant_settings
ALTER TABLE assistant_settings ADD COLUMN IF NOT EXISTS missed_call_textback_enabled boolean DEFAULT true;
ALTER TABLE assistant_settings ADD COLUMN IF NOT EXISTS missed_call_textback_message text;

-- Table to dedup missed-call texts (don't spam the same caller)
CREATE TABLE IF NOT EXISTS missed_call_textbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  caller_phone text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  twilio_sms_sid text,
  off_behavior text,
  reason text
);

CREATE INDEX IF NOT EXISTS idx_missed_call_textbacks_dedup
  ON missed_call_textbacks (tenant_id, caller_phone, sent_at DESC);

-- RLS
ALTER TABLE missed_call_textbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on missed_call_textbacks"
  ON missed_call_textbacks FOR ALL
  USING (true) WITH CHECK (true);

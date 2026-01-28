-- Add calendar and setup tracking to assistant_settings
ALTER TABLE assistant_settings 
ADD COLUMN IF NOT EXISTS booking_url TEXT,
ADD COLUMN IF NOT EXISTS calendar_provider TEXT,
ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS setup_step_phone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS setup_step_calendar BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS setup_step_tested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_method TEXT;

-- Add comment for clarity
COMMENT ON COLUMN assistant_settings.booking_url IS 'Universal booking link (Calendly, Cal.com, Acuity, etc.)';
COMMENT ON COLUMN assistant_settings.calendar_provider IS 'Calendar provider type: google, outlook, apple, calendly, acuity, cal_com, other';
COMMENT ON COLUMN assistant_settings.setup_completed_at IS 'Timestamp when all setup steps were completed';
COMMENT ON COLUMN assistant_settings.setup_step_phone IS 'Whether phone connection step is complete';
COMMENT ON COLUMN assistant_settings.setup_step_calendar IS 'Whether calendar connection step is complete';
COMMENT ON COLUMN assistant_settings.setup_step_tested IS 'Whether AI testing step is complete';
COMMENT ON COLUMN assistant_settings.phone_method IS 'Phone provisioning method: closeloop_number or forwarded';
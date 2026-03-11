-- Phase A: Schema updates for closing silent failures
-- A5: Add 'transfer' to delivery_entity_type enum
-- A6: Add 'skipped' to delivery_attempts status
-- A8: Add 'google_calendar' and 'square' to handoff_attempts method

-- A5: Add 'transfer' entity type for transfer notification tracking
DO $$ BEGIN
  ALTER TYPE public.delivery_entity_type ADD VALUE IF NOT EXISTS 'transfer';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A6: Allow 'skipped' status in delivery_attempts for SMS skip tracking
ALTER TABLE public.delivery_attempts DROP CONSTRAINT IF EXISTS delivery_attempts_status_check;
ALTER TABLE public.delivery_attempts ADD CONSTRAINT delivery_attempts_status_check
  CHECK (status IN ('pending', 'success', 'failed', 'skipped'));

-- A8: Allow 'google_calendar' and 'square' methods in handoff_attempts for sync retry
ALTER TABLE public.handoff_attempts DROP CONSTRAINT IF EXISTS handoff_attempts_method_check;
ALTER TABLE public.handoff_attempts ADD CONSTRAINT handoff_attempts_method_check
  CHECK (method IN ('webhook', 'email', 'sms', 'print', 'google_calendar', 'square'));

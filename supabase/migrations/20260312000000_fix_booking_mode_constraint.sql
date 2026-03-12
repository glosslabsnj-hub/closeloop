-- Fix ai_booking_mode check constraint to allow all valid booking modes
-- Previous constraint only allowed 'auto_book' and 'pending_approval'
-- but onboarding can set 'callback_only' and 'suggest_callback' too.
-- This caused error 23514 during onboarding Step 10, silently preventing
-- the booking mode from being saved.

-- Drop the old constraint
ALTER TABLE public.assistant_settings
DROP CONSTRAINT IF EXISTS assistant_settings_ai_booking_mode_check;

-- Add the new constraint with all valid values
ALTER TABLE public.assistant_settings
ADD CONSTRAINT assistant_settings_ai_booking_mode_check
CHECK (ai_booking_mode IN ('auto_book', 'pending_approval', 'callback_only', 'suggest_callback'));

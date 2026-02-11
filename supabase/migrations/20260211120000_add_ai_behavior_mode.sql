-- Add ai_behavior_mode enum and column to assistant_settings
-- Controls WHAT the AI does when it answers: full service vs capture-only

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_behavior_mode') THEN
    CREATE TYPE ai_behavior_mode AS ENUM ('full_service', 'callback_only');
  END IF;
END$$;

ALTER TABLE assistant_settings
  ADD COLUMN IF NOT EXISTS ai_behavior_mode ai_behavior_mode NOT NULL DEFAULT 'full_service';

COMMENT ON COLUMN assistant_settings.ai_behavior_mode IS 'Controls AI call behavior: full_service = book/dispatch/order as normal, callback_only = only capture info and create callbacks';

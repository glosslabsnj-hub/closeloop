-- Add 'emergency' to dispatch_priority enum.
-- The UI shows Emergency as a priority option but the enum only had: low/normal/high/urgent.
-- This caused 400 errors when creating jobs with Emergency priority.
-- The AI function (elevenlabs-create-dispatch-job) maps urgency="emergency" → priority="urgent",
-- so AI-created jobs were fine, but manual dispatch job creation from the UI was broken.

ALTER TYPE public.dispatch_priority ADD VALUE IF NOT EXISTS 'emergency';

-- Update dispatch-handoff logic: treat 'emergency' same as 'urgent' for isUrgent flag.
-- (No DB change needed; dispatch-handoff checks priority in application code.)

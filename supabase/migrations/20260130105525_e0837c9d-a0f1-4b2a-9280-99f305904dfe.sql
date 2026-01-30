-- Add notification sound settings
ALTER TABLE assistant_settings 
ADD COLUMN IF NOT EXISTS notification_sounds_enabled boolean NOT NULL DEFAULT true;

-- Add sound type to owner_notifications for categorized alerts
ALTER TABLE owner_notifications 
ADD COLUMN IF NOT EXISTS sound_type text NULL;
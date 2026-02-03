-- Add admin_active_mode column to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS admin_active_mode text DEFAULT 'service';
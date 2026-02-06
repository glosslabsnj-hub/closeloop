-- Add default_distance_basis column to tenant_distance_settings
ALTER TABLE tenant_distance_settings 
ADD COLUMN IF NOT EXISTS default_distance_basis TEXT 
DEFAULT 'tow_distance' 
CHECK (default_distance_basis IN ('tow_distance', 'dispatch_distance', 'total_trip', 'flat'));
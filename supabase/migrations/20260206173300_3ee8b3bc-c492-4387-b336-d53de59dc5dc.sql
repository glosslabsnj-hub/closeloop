-- Add status tracking columns to dispatch_jobs
ALTER TABLE dispatch_jobs 
ADD COLUMN IF NOT EXISTS en_route_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS on_site_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_arrival_at TIMESTAMPTZ;

-- Add location tracking columns to fleet_drivers for real-time GPS (optional feature)
ALTER TABLE fleet_drivers 
ADD COLUMN IF NOT EXISTS location_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_known_lat DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS last_known_lng DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Add index for faster job lookups by customer phone
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_customer_phone 
ON dispatch_jobs(customer_phone) 
WHERE status NOT IN ('completed', 'cancelled');

-- Add index for faster job lookups by pickup address
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_pickup_address 
ON dispatch_jobs(pickup_address) 
WHERE status NOT IN ('completed', 'cancelled');

COMMENT ON COLUMN dispatch_jobs.en_route_at IS 'Timestamp when driver marked job as en_route';
COMMENT ON COLUMN dispatch_jobs.on_site_at IS 'Timestamp when driver marked job as on_site';
COMMENT ON COLUMN dispatch_jobs.estimated_arrival_at IS 'Calculated ETA based on en_route time + drive estimate';
COMMENT ON COLUMN fleet_drivers.location_enabled IS 'Whether real-time GPS tracking is enabled for this driver';
COMMENT ON COLUMN fleet_drivers.last_known_lat IS 'Last known latitude from GPS tracking';
COMMENT ON COLUMN fleet_drivers.last_known_lng IS 'Last known longitude from GPS tracking';
COMMENT ON COLUMN fleet_drivers.location_updated_at IS 'When the location was last updated';
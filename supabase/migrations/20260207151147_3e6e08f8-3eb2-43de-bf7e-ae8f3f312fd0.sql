-- Create storage bucket for dispatch/impound photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dispatch-photos', 'dispatch-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Add photos column to dispatch_jobs if not exists
ALTER TABLE public.dispatch_jobs 
ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;

-- Create storage policy for drivers to upload photos
DROP POLICY IF EXISTS "Drivers can upload dispatch photos" ON storage.objects;
CREATE POLICY "Drivers can upload dispatch photos"
  ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dispatch-photos');

-- Create storage policy for anyone to view photos
DROP POLICY IF EXISTS "Anyone can view dispatch photos" ON storage.objects;
CREATE POLICY "Anyone can view dispatch photos"
  ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'dispatch-photos');

-- Create storage policy for drivers to delete their own photos
DROP POLICY IF EXISTS "Drivers can delete dispatch photos" ON storage.objects;
CREATE POLICY "Drivers can delete dispatch photos"
  ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'dispatch-photos');
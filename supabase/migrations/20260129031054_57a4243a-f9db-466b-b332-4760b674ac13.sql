-- Create storage bucket for knowledge documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-documents', 'knowledge-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload to their tenant folder
DROP POLICY IF EXISTS "Tenant users can upload documents" ON storage.objects;
CREATE POLICY "Tenant users can upload documents"
  ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

-- RLS: Users can view their tenant's documents
DROP POLICY IF EXISTS "Tenant users can view documents" ON storage.objects;
CREATE POLICY "Tenant users can view documents"
  ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

-- RLS: Users can delete their tenant's documents
DROP POLICY IF EXISTS "Tenant users can delete documents" ON storage.objects;
CREATE POLICY "Tenant users can delete documents"
  ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.tenant_users WHERE user_id = auth.uid()
  )
);
-- Create table: knowledge_uploads
CREATE TABLE public.knowledge_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT CHECK (file_type IN ('pdf', 'csv', 'xlsx', 'docx', 'txt', 'png', 'jpg')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'parsed', 'needs_review', 'approved', 'rejected', 'error')),
  extracted_text TEXT,
  parsed_json JSONB,
  conflict_summary JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table: knowledge_merge_queue
CREATE TABLE public.knowledge_merge_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.knowledge_uploads(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('service', 'menu_item', 'policy', 'faq', 'intake_field', 'menu_category')),
  entity_key TEXT NOT NULL,
  existing_value JSONB,
  proposed_value JSONB NOT NULL,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('different_price', 'missing_field', 'name_mismatch', 'duplicate', 'new_item', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_knowledge_uploads_tenant_id ON public.knowledge_uploads(tenant_id);
CREATE INDEX idx_knowledge_uploads_status ON public.knowledge_uploads(status);
CREATE INDEX idx_knowledge_merge_queue_tenant_id ON public.knowledge_merge_queue(tenant_id);
CREATE INDEX idx_knowledge_merge_queue_upload_id ON public.knowledge_merge_queue(upload_id);
CREATE INDEX idx_knowledge_merge_queue_status ON public.knowledge_merge_queue(status);

-- Enable RLS
ALTER TABLE public.knowledge_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_merge_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_uploads
CREATE POLICY "Tenant isolation for knowledge_uploads"
  ON public.knowledge_uploads
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

-- RLS policies for knowledge_merge_queue
CREATE POLICY "Tenant isolation for knowledge_merge_queue"
  ON public.knowledge_merge_queue
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

-- Trigger for updated_at on knowledge_uploads
CREATE TRIGGER update_knowledge_uploads_updated_at
  BEFORE UPDATE ON public.knowledge_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for merge queue (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_merge_queue;
-- =====================================================
-- Upload-to-Knowledge Notification System Schema
-- =====================================================

-- Create ENUMs for new tables
CREATE TYPE knowledge_source_type AS ENUM ('menu_pdf', 'pricing', 'services_doc', 'faq_doc', 'general');
CREATE TYPE knowledge_source_status AS ENUM ('uploading', 'processing', 'ready', 'failed');
CREATE TYPE suggestion_type AS ENUM ('service', 'faq', 'menu_item', 'policy', 'objection');
CREATE TYPE suggestion_status AS ENUM ('pending_review', 'approved', 'rejected', 'merged');
CREATE TYPE conflict_type AS ENUM ('price_mismatch', 'description_mismatch', 'name_mismatch', 'duration_mismatch', 'other');
CREATE TYPE conflict_status AS ENUM ('unresolved', 'keep_existing', 'accept_upload', 'custom_merged');
CREATE TYPE notification_type AS ENUM ('upload_processing', 'upload_ready', 'upload_failed', 'suggestions_pending', 'conflicts_detected', 'conflicts_resolved');
CREATE TYPE notification_severity AS ENUM ('info', 'warning', 'critical');

-- =====================================================
-- Table: knowledge_sources
-- Tracks uploaded documents and their processing status
-- =====================================================
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text,
  source_type knowledge_source_type NOT NULL DEFAULT 'general',
  status knowledge_source_status NOT NULL DEFAULT 'uploading',
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant knowledge sources" ON public.knowledge_sources;
CREATE POLICY "Users can view tenant knowledge sources"
  ON public.knowledge_sources FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can manage knowledge sources" ON public.knowledge_sources;
CREATE POLICY "Owners can manage knowledge sources"
  ON public.knowledge_sources FOR ALL
  USING (
    (tenant_id IN (
      SELECT tenant_users.tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'::user_role
    )) OR has_role(auth.uid(), 'super_admin'::user_role)
  );

-- Enable realtime for knowledge_sources
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'knowledge_sources') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_sources;
  END IF;
END $$;

-- =====================================================
-- Table: extracted_knowledge_suggestions
-- AI-extracted items pending owner review
-- =====================================================
CREATE TABLE IF NOT EXISTS public.extracted_knowledge_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  suggestion_type suggestion_type NOT NULL,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status suggestion_status NOT NULL DEFAULT 'pending_review',
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extracted_knowledge_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant suggestions" ON public.extracted_knowledge_suggestions;
CREATE POLICY "Users can view tenant suggestions"
  ON public.extracted_knowledge_suggestions FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can manage suggestions" ON public.extracted_knowledge_suggestions;
CREATE POLICY "Owners can manage suggestions"
  ON public.extracted_knowledge_suggestions FOR ALL
  USING (
    (tenant_id IN (
      SELECT tenant_users.tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'::user_role
    )) OR has_role(auth.uid(), 'super_admin'::user_role)
  );

-- =====================================================
-- Table: knowledge_conflicts
-- Detected conflicts between uploads and existing data
-- =====================================================
CREATE TABLE IF NOT EXISTS public.knowledge_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  conflict_type conflict_type NOT NULL DEFAULT 'other',
  entity_type text NOT NULL,
  existing_entity_id uuid,
  existing_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  differing_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  status conflict_status NOT NULL DEFAULT 'unresolved',
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant conflicts" ON public.knowledge_conflicts;
CREATE POLICY "Users can view tenant conflicts"
  ON public.knowledge_conflicts FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can manage conflicts" ON public.knowledge_conflicts;
CREATE POLICY "Owners can manage conflicts"
  ON public.knowledge_conflicts FOR ALL
  USING (
    (tenant_id IN (
      SELECT tenant_users.tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'::user_role
    )) OR has_role(auth.uid(), 'super_admin'::user_role)
  );

-- Enable realtime for knowledge_conflicts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'knowledge_conflicts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_conflicts;
  END IF;
END $$;

-- =====================================================
-- Table: owner_notifications
-- In-app notifications for business owners
-- =====================================================
CREATE TABLE IF NOT EXISTS public.owner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity notification_severity NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  action_path text,
  related_source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant notifications" ON public.owner_notifications;
CREATE POLICY "Users can view tenant notifications"
  ON public.owner_notifications FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant notifications" ON public.owner_notifications;
CREATE POLICY "Users can update tenant notifications"
  ON public.owner_notifications FOR UPDATE
  USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.owner_notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.owner_notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime for owner_notifications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'owner_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_notifications;
  END IF;
END $$;

-- =====================================================
-- Trigger Functions
-- =====================================================

-- Function: Notify on knowledge source status change
CREATE OR REPLACE FUNCTION public.notify_on_knowledge_source_status()
RETURNS TRIGGER AS $$
BEGIN
  -- On status change to 'processing'
  IF NEW.status = 'processing' AND (OLD.status IS NULL OR OLD.status != 'processing') THEN
    INSERT INTO public.owner_notifications (tenant_id, type, title, message, severity, action_path, related_source_id)
    VALUES (
      NEW.tenant_id,
      'upload_processing',
      'Processing your upload',
      'Your file "' || NEW.file_name || '" is being processed. We''ll notify you when it''s ready.',
      'info',
      '/brain?tab=updates',
      NEW.id
    );
  END IF;
  
  -- On status change to 'ready'
  IF NEW.status = 'ready' AND (OLD.status IS NULL OR OLD.status != 'ready') THEN
    INSERT INTO public.owner_notifications (tenant_id, type, title, message, severity, action_path, related_source_id)
    VALUES (
      NEW.tenant_id,
      'upload_ready',
      'Upload ready for review',
      'Your file "' || NEW.file_name || '" has been processed. Review the extracted items to update your AI knowledge.',
      'info',
      '/brain?tab=updates',
      NEW.id
    );
  END IF;
  
  -- On status change to 'failed'
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    INSERT INTO public.owner_notifications (tenant_id, type, title, message, severity, action_path, related_source_id)
    VALUES (
      NEW.tenant_id,
      'upload_failed',
      'Upload processing failed',
      'We couldn''t process "' || NEW.file_name || '". ' || COALESCE(NEW.error_message, 'Please try uploading again.'),
      'warning',
      '/brain?tab=updates',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS knowledge_source_status_notify ON public.knowledge_sources;
CREATE TRIGGER knowledge_source_status_notify
  AFTER UPDATE OF status ON public.knowledge_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_knowledge_source_status();

-- Function: Notify on new pending suggestions
CREATE OR REPLACE FUNCTION public.notify_on_suggestions_pending()
RETURNS TRIGGER AS $$
DECLARE
  pending_count int;
BEGIN
  -- Count pending suggestions for this tenant
  SELECT COUNT(*) INTO pending_count
  FROM public.extracted_knowledge_suggestions
  WHERE tenant_id = NEW.tenant_id AND status = 'pending_review';
  
  -- Only notify if this is the first pending suggestion (avoid spam)
  IF pending_count = 1 THEN
    INSERT INTO public.owner_notifications (tenant_id, type, title, message, severity, action_path, related_source_id)
    VALUES (
      NEW.tenant_id,
      'suggestions_pending',
      'New suggestions to review',
      'We extracted items from your upload that need your approval before the AI can use them.',
      'info',
      '/brain?tab=updates&subtab=suggestions',
      NEW.source_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS suggestions_pending_notify ON public.extracted_knowledge_suggestions;
CREATE TRIGGER suggestions_pending_notify
  AFTER INSERT ON public.extracted_knowledge_suggestions
  FOR EACH ROW
  WHEN (NEW.status = 'pending_review')
  EXECUTE FUNCTION public.notify_on_suggestions_pending();

-- Function: Notify on conflicts detected
CREATE OR REPLACE FUNCTION public.notify_on_conflicts_detected()
RETURNS TRIGGER AS $$
DECLARE
  unresolved_count int;
BEGIN
  -- Count unresolved conflicts for this tenant
  SELECT COUNT(*) INTO unresolved_count
  FROM public.knowledge_conflicts
  WHERE tenant_id = NEW.tenant_id AND status = 'unresolved';
  
  -- Only notify if this is the first conflict (avoid spam)
  IF unresolved_count = 1 THEN
    INSERT INTO public.owner_notifications (tenant_id, type, title, message, severity, action_path, related_source_id)
    VALUES (
      NEW.tenant_id,
      'conflicts_detected',
      'Action needed: Review conflicts',
      'We found differences between your upload and your current settings. The AI will keep using your existing data until you resolve these.',
      'critical',
      '/brain?tab=updates&subtab=conflicts',
      NEW.source_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS conflicts_detected_notify ON public.knowledge_conflicts;
CREATE TRIGGER conflicts_detected_notify
  AFTER INSERT ON public.knowledge_conflicts
  FOR EACH ROW
  WHEN (NEW.status = 'unresolved')
  EXECUTE FUNCTION public.notify_on_conflicts_detected();

-- Function: Notify when all conflicts resolved
CREATE OR REPLACE FUNCTION public.notify_on_conflicts_resolved()
RETURNS TRIGGER AS $$
DECLARE
  unresolved_count int;
BEGIN
  -- Only fire if status changed from unresolved to something else
  IF OLD.status = 'unresolved' AND NEW.status != 'unresolved' THEN
    -- Count remaining unresolved conflicts
    SELECT COUNT(*) INTO unresolved_count
    FROM public.knowledge_conflicts
    WHERE tenant_id = NEW.tenant_id AND status = 'unresolved';
    
    -- If no more unresolved conflicts, notify
    IF unresolved_count = 0 THEN
      INSERT INTO public.owner_notifications (tenant_id, type, title, message, severity, action_path)
      VALUES (
        NEW.tenant_id,
        'conflicts_resolved',
        'All conflicts resolved',
        'Great — your AI knowledge is now updated and consistent!',
        'info',
        '/brain'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS conflicts_resolved_notify ON public.knowledge_conflicts;
CREATE TRIGGER conflicts_resolved_notify
  AFTER UPDATE OF status ON public.knowledge_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_conflicts_resolved();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_tenant_status ON public.knowledge_sources(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_suggestions_tenant_status ON public.extracted_knowledge_suggestions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_conflicts_tenant_status ON public.knowledge_conflicts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_unread ON public.owner_notifications(tenant_id, is_read) WHERE is_read = false;
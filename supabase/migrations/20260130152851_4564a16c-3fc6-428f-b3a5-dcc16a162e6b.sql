-- Add additional fields to knowledge_gaps for better tracking
ALTER TABLE public.knowledge_gaps 
ADD COLUMN IF NOT EXISTS suggested_section text,
ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'normal'::text,
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone DEFAULT now();

-- Create index for faster lookups on unresolved gaps
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_tenant_resolved 
ON public.knowledge_gaps (tenant_id, resolved, priority DESC);

-- Update trigger to set last_seen_at on occurrence update
CREATE OR REPLACE FUNCTION update_knowledge_gap_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.occurrence_count != OLD.occurrence_count THEN
    NEW.last_seen_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_knowledge_gap_last_seen ON public.knowledge_gaps;
CREATE TRIGGER tr_knowledge_gap_last_seen
  BEFORE UPDATE ON public.knowledge_gaps
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_gap_last_seen();
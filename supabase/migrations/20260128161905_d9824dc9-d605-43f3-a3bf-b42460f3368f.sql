-- Create industry_demos table for demo recordings
CREATE TABLE public.industry_demos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  audio_url TEXT,
  caption_bullets JSONB NOT NULL DEFAULT '[]'::JSONB,
  transcript_excerpt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.industry_demos ENABLE ROW LEVEL SECURITY;

-- Public read access for active demos (visitors can see them)
CREATE POLICY "Active demos are publicly readable"
  ON public.industry_demos
  FOR SELECT
  USING (is_active = true);

-- Super admins can do everything
CREATE POLICY "Super admins can manage demos"
  ON public.industry_demos
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Create storage bucket for demo audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('demo-audio', 'demo-audio', true);

-- Storage policy: public read access
CREATE POLICY "Demo audio is publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'demo-audio');

-- Storage policy: super admins can upload
CREATE POLICY "Super admins can upload demo audio"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'demo-audio' AND public.has_role(auth.uid(), 'super_admin'));

-- Storage policy: super admins can update
CREATE POLICY "Super admins can update demo audio"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'demo-audio' AND public.has_role(auth.uid(), 'super_admin'));

-- Storage policy: super admins can delete
CREATE POLICY "Super admins can delete demo audio"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'demo-audio' AND public.has_role(auth.uid(), 'super_admin'));

-- Updated at trigger
CREATE TRIGGER update_industry_demos_updated_at
  BEFORE UPDATE ON public.industry_demos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default demo entries (without audio - admin will upload)
INSERT INTO public.industry_demos (industry_key, title, caption_bullets, transcript_excerpt, is_active)
VALUES
  ('service', 'Service Business', '["AI answers and qualifies the caller", "Captures name, phone, and service needed", "Sends booking link or creates appointment", "You get notified instantly"]'::JSONB, 'AI: "Hi, thanks for calling! I can help you schedule a service. What type of service are you looking for today?"', true),
  ('dispatch', 'Towing & Dispatch', '["AI captures location first (critical for dispatch)", "Asks about vehicle and situation", "Creates urgent dispatch job automatically", "Texts customer with ETA updates"]'::JSONB, 'AI: "I understand you need help. First, can you tell me your exact location or nearest cross streets?"', true),
  ('food', 'Restaurant', '["AI takes full order with modifications", "Handles dietary restrictions", "Confirms order before hanging up", "Kitchen ticket prints automatically"]'::JSONB, 'AI: "Welcome! I can help you place an order. Would you like pickup or delivery today?"', true),
  ('medical', 'Medical & Dental', '["AI collects reason for visit (no diagnosis)", "Captures insurance and preferred times", "Creates intake record for staff review", "HIPAA-ready data handling"]'::JSONB, 'AI: "Thank you for calling. I can help schedule your appointment. What brings you in today?"', true);
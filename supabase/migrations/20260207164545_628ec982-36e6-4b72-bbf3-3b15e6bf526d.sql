-- Create voice_options table for secure voice configuration
CREATE TABLE public.voice_options (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  provider_voice_id text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed default voices
INSERT INTO public.voice_options (id, name, description, provider_voice_id, is_active) VALUES 
  ('james', 'James', 'Professional and confident male voice', 'TX3LPaxmHKxFdv7VOQHJ', true),
  ('sarah', 'Sarah', 'Warm and friendly female voice', 'EXAVITQu4vr4xnSDxMaL', true);

-- Enable RLS
ALTER TABLE public.voice_options ENABLE ROW LEVEL SECURITY;

-- Read-only policy for authenticated users (only active voices)
CREATE POLICY "Authenticated users can read active voices" 
  ON public.voice_options 
  FOR SELECT 
  TO authenticated 
  USING (is_active = true);
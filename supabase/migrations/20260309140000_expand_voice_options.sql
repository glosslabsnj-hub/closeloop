-- Expand voice_options table with gender, accent, and category metadata
-- Also seed curated receptionist-quality voices from ElevenLabs

-- Add metadata columns for better voice browsing
ALTER TABLE public.voice_options
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS accent text,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'premade';

-- Clear old seeded data (only had james/sarah with wrong provider IDs)
DELETE FROM public.voice_options WHERE id IN ('james', 'sarah');

-- Insert curated receptionist voices (American English, professional/conversational)
INSERT INTO public.voice_options (id, name, description, provider_voice_id, gender, accent, category, is_active)
VALUES
  -- Female voices
  ('sarah', 'Sarah', 'Mature, reassuring, and confident. Professional tone with warmth.', 'EXAVITQu4vr4xnSDxMaL', 'female', 'american', 'premade', true),
  ('jessica', 'Jessica', 'Playful, bright, and warm. Friendly conversational style.', 'cgSgspJ2msm6clMCkdW9', 'female', 'american', 'premade', true),
  ('bella', 'Bella', 'Professional, bright, and warm. Great for business calls.', 'hpp4J3VqNfWAUOO0d1Us', 'female', 'american', 'premade', true),
  ('matilda', 'Matilda', 'Knowledgeable and professional with an upbeat energy.', 'XrExE9yKIg1WjnnlVkGX', 'female', 'american', 'premade', true),
  ('adalina', 'Adalina', 'Professional and friendly. Confident and clear.', 'i2SoWWnAm3qCyr53Jenw', 'female', 'american', 'professional', true),
  -- Male voices
  ('eric', 'Eric', 'Smooth and trustworthy. Classy conversational tone.', 'cjVigY5qzO86Huf0OWal', 'male', 'american', 'premade', true),
  ('chris', 'Chris', 'Charming and down-to-earth. Casual and approachable.', 'iP95p4xoKVk53GoZ742B', 'male', 'american', 'premade', true),
  ('brian', 'Brian', 'Deep, resonant, and comforting. Authoritative presence.', 'nPczCjzI2devNBz1zQrb', 'male', 'american', 'premade', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  provider_voice_id = EXCLUDED.provider_voice_id,
  gender = EXCLUDED.gender,
  accent = EXCLUDED.accent,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

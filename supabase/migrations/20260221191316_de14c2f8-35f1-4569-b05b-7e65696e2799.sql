
-- Add media columns to wa_messages
ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_mime text,
  ADD COLUMN IF NOT EXISTS media_filename text,
  ADD COLUMN IF NOT EXISTS media_size integer,
  ADD COLUMN IF NOT EXISTS media_duration integer,
  ADD COLUMN IF NOT EXISTS meta_media_id text;

-- Create storage bucket for WhatsApp media
INSERT INTO storage.buckets (id, name, public)
VALUES ('wa-media', 'wa-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for wa-media bucket
CREATE POLICY "Anyone can view WhatsApp media"
ON storage.objects FOR SELECT
USING (bucket_id = 'wa-media');

CREATE POLICY "Authenticated users can upload WhatsApp media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wa-media' AND auth.role() = 'authenticated');

CREATE POLICY "Service role can upload WhatsApp media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wa-media');

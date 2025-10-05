-- Add thumbnail_url column to product_videos table
ALTER TABLE product_videos
ADD COLUMN thumbnail_url text;

-- Create storage bucket for video thumbnails if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-thumbnails', 'video-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for video thumbnails bucket
CREATE POLICY "Admins can upload video thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'video-thumbnails' 
  AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
);

CREATE POLICY "Admins can update video thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'video-thumbnails'
  AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
);

CREATE POLICY "Admins can delete video thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'video-thumbnails'
  AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
);

CREATE POLICY "Anyone can view video thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'video-thumbnails');
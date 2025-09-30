-- Add video_content column to product_videos table
ALTER TABLE public.product_videos 
ADD COLUMN IF NOT EXISTS video_content TEXT;

-- Migrate existing data: copy video_url to video_content for existing records
UPDATE public.product_videos 
SET video_content = CONCAT('<p>', caption, '</p><p><a href="', video_url, '" target="_blank">', video_url, '</a></p>')
WHERE video_content IS NULL;

-- Make video_content required
ALTER TABLE public.product_videos 
ALTER COLUMN video_content SET NOT NULL;

-- Keep old columns for backward compatibility (can be removed later if needed)
ALTER TABLE public.product_videos 
ALTER COLUMN caption DROP NOT NULL,
ALTER COLUMN video_url DROP NOT NULL;
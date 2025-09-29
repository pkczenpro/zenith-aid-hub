-- Update resource types to include new categories and support video
ALTER TABLE public.product_resources 
DROP CONSTRAINT IF EXISTS product_resources_resource_type_check;

ALTER TABLE public.product_resources 
ADD CONSTRAINT product_resources_resource_type_check 
CHECK (resource_type IN ('sales_deck', 'factsheet', 'case_study', 'brochure', 'tutorial', 'video', 'other'));

-- Add file_type column to track whether it's PDF or video
ALTER TABLE public.product_resources 
ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'pdf' CHECK (file_type IN ('pdf', 'video'));
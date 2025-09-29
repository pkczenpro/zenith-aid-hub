-- Update storage policies to ensure public read access for downloads
DROP POLICY IF EXISTS "Anyone can view product resources" ON storage.objects;

CREATE POLICY "Public can view and download product resources"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-resources');

-- Update file type constraint to only allow PDF and PPTX
ALTER TABLE public.product_resources 
DROP CONSTRAINT IF EXISTS product_resources_file_type_check;

ALTER TABLE public.product_resources 
ADD CONSTRAINT product_resources_file_type_check 
CHECK (file_type IN ('pdf', 'pptx'));
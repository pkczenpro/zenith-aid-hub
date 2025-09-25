-- Create storage bucket for product icons
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-icons', 'product-icons', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

-- Create storage policies for product icons
CREATE POLICY "Anyone can view product icons" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-icons');

CREATE POLICY "Admins can upload product icons" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-icons' AND 
    public.is_admin()
  );

CREATE POLICY "Admins can update product icons" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'product-icons' AND 
    public.is_admin()
  );

CREATE POLICY "Admins can delete product icons" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-icons' AND 
    public.is_admin()
  );
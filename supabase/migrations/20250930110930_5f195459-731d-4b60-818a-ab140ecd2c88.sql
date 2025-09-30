-- Allow unauthenticated users to view published products
CREATE POLICY "Public can view published products"
ON public.products
FOR SELECT
TO public
USING (status = 'published');
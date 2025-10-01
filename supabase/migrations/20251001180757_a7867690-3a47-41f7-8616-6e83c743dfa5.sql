-- Allow clients to view resources for products they have access to
CREATE POLICY "Clients can view product resources they have access to"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-resources' 
  AND EXISTS (
    SELECT 1
    FROM product_resources pr
    JOIN client_product_access cpa ON cpa.product_id = pr.product_id
    JOIN clients c ON c.id = cpa.client_id
    JOIN profiles p ON p.id = c.profile_id
    WHERE p.user_id = auth.uid()
    AND storage.objects.name = pr.file_url
  )
);

-- Allow admins to view all product resources
CREATE POLICY "Admins can view all product resources"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-resources'
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow public access if product is published (optional, remove if not needed)
CREATE POLICY "Public can view product resources for published products"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'product-resources'
  AND EXISTS (
    SELECT 1
    FROM product_resources pr
    JOIN products prod ON prod.id = pr.product_id
    WHERE prod.status = 'published'
    AND storage.objects.name = pr.file_url
  )
);
-- Create storage bucket for product resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-resources', 'product-resources', true);

-- Create product_resources table
CREATE TABLE public.product_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('factsheet', 'sales_material', 'tutorial', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_resources
CREATE POLICY "Admins can manage all resources"
ON public.product_resources
FOR ALL
USING (is_admin());

CREATE POLICY "Clients can view resources for products they have access to"
ON public.product_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_product_access cpa
    JOIN clients c ON c.id = cpa.client_id
    WHERE cpa.product_id = product_resources.product_id
    AND c.profile_id = get_current_profile()
  )
);

-- Storage policies for product-resources bucket
CREATE POLICY "Admins can upload resources"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-resources' 
  AND is_admin()
);

CREATE POLICY "Admins can update resources"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-resources' 
  AND is_admin()
);

CREATE POLICY "Admins can delete resources"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-resources' 
  AND is_admin()
);

CREATE POLICY "Anyone can view product resources"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-resources');

-- Trigger for updated_at
CREATE TRIGGER update_product_resources_updated_at
BEFORE UPDATE ON public.product_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
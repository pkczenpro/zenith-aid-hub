-- Create video_categories table
CREATE TABLE IF NOT EXISTS public.video_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;

-- Policies for video_categories
CREATE POLICY "Admins can manage all video categories"
  ON public.video_categories
  FOR ALL
  USING (is_admin());

CREATE POLICY "Clients can view categories for products they have access to"
  ON public.video_categories
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM client_product_access cpa
    JOIN clients c ON c.id = cpa.client_id
    WHERE cpa.product_id = video_categories.product_id
    AND c.profile_id = get_current_profile()
  ));

-- Add category_id to product_videos
ALTER TABLE public.product_videos 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.video_categories(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_videos_category_id ON public.product_videos(category_id);
CREATE INDEX IF NOT EXISTS idx_video_categories_product_id ON public.video_categories(product_id);

-- Trigger for updated_at
CREATE TRIGGER update_video_categories_updated_at
  BEFORE UPDATE ON public.video_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
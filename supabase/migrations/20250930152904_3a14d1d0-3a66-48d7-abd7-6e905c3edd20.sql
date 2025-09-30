-- Create product_videos table
CREATE TABLE public.product_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  caption TEXT,
  video_url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all videos"
ON public.product_videos
FOR ALL
USING (is_admin());

CREATE POLICY "Clients can view videos for products they have access to"
ON public.product_videos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_product_access cpa
    JOIN clients c ON c.id = cpa.client_id
    WHERE cpa.product_id = product_videos.product_id
    AND c.profile_id = get_current_profile()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_product_videos_updated_at
BEFORE UPDATE ON public.product_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_product_videos_product_id ON public.product_videos(product_id);
CREATE INDEX idx_product_videos_order_index ON public.product_videos(order_index);
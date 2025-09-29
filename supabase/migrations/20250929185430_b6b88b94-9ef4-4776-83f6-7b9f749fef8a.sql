-- Create table for tracking resource downloads
CREATE TABLE public.resource_downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES public.product_resources(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  downloaded_at timestamp with time zone NOT NULL DEFAULT now(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.resource_downloads ENABLE ROW LEVEL SECURITY;

-- Admins can view all download logs
CREATE POLICY "Admins can view all download logs"
ON public.resource_downloads
FOR SELECT
USING (is_admin());

-- Users can view their own download logs
CREATE POLICY "Users can view their own download logs"
ON public.resource_downloads
FOR SELECT
USING (profile_id = get_current_profile());

-- Anyone with access can log downloads
CREATE POLICY "Users can log their own downloads"
ON public.resource_downloads
FOR INSERT
WITH CHECK (profile_id = get_current_profile());

-- Create index for better performance
CREATE INDEX idx_resource_downloads_resource_id ON public.resource_downloads(resource_id);
CREATE INDEX idx_resource_downloads_profile_id ON public.resource_downloads(profile_id);

-- Create table for release notes
CREATE TABLE public.release_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title text NOT NULL,
  version text,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;

-- Admins can manage all release notes
CREATE POLICY "Admins can manage all release notes"
ON public.release_notes
FOR ALL
USING (is_admin());

-- Clients can view published release notes for products they have access to
CREATE POLICY "Clients can view published release notes"
ON public.release_notes
FOR SELECT
USING (
  status = 'published' 
  AND EXISTS (
    SELECT 1 FROM client_product_access cpa
    JOIN clients c ON c.id = cpa.client_id
    WHERE cpa.product_id = release_notes.product_id
    AND c.profile_id = get_current_profile()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_release_notes_updated_at
BEFORE UPDATE ON public.release_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_release_notes_product_id ON public.release_notes(product_id);
CREATE INDEX idx_release_notes_status ON public.release_notes(status);
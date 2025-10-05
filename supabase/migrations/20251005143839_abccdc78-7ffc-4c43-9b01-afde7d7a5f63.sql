-- Create brand_settings table for customizing site appearance
CREATE TABLE IF NOT EXISTS public.brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_name text NOT NULL DEFAULT 'Zenithr Assistant',
  chatbot_icon_url text,
  chatbot_brand_color text NOT NULL DEFAULT '262 83% 58%',
  primary_color text NOT NULL DEFAULT '262 83% 58%',
  secondary_color text NOT NULL DEFAULT '240 5% 96%',
  accent_color text NOT NULL DEFAULT '212 100% 47%',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Policies for brand_settings
CREATE POLICY "Admins can manage brand settings"
  ON public.brand_settings
  FOR ALL
  USING (is_admin());

CREATE POLICY "Everyone can view brand settings"
  ON public.brand_settings
  FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_brand_settings_updated_at
  BEFORE UPDATE ON public.brand_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.brand_settings (chatbot_name, updated_by)
SELECT 'Zenithr Assistant', id 
FROM public.profiles 
WHERE role = 'admin'::app_role 
LIMIT 1;
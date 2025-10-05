-- Create product_welcome_messages table
CREATE TABLE public.product_welcome_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  show_features BOOLEAN DEFAULT true,
  custom_button_text TEXT DEFAULT 'View Documentation',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_welcome_messages ENABLE ROW LEVEL SECURITY;

-- Admins can manage all welcome messages
CREATE POLICY "Admins can manage all welcome messages"
  ON public.product_welcome_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Clients can view welcome messages for products they have access to
CREATE POLICY "Clients can view welcome messages for accessible products"
  ON public.product_welcome_messages
  FOR SELECT
  USING (
    is_active = true AND (
      EXISTS (
        SELECT 1
        FROM client_product_access cpa
        JOIN clients c ON c.id = cpa.client_id
        WHERE cpa.product_id = product_welcome_messages.product_id
        AND c.profile_id = get_current_profile()
      )
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_product_welcome_messages_updated_at
  BEFORE UPDATE ON public.product_welcome_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create ticket_responses table for storing resolutions and responses
CREATE TABLE public.ticket_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES public.profiles(id),
  response_text TEXT NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  video_id UUID REFERENCES public.product_videos(id) ON DELETE SET NULL,
  resource_id UUID REFERENCES public.product_resources(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;

-- Users can view responses for their own tickets
CREATE POLICY "Users can view responses for their tickets"
ON public.ticket_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_responses.ticket_id
    AND st.profile_id = get_current_profile()
  )
);

-- Admins can view all responses
CREATE POLICY "Admins can view all responses"
ON public.ticket_responses
FOR SELECT
USING (is_admin());

-- Admins can create responses
CREATE POLICY "Admins can create responses"
ON public.ticket_responses
FOR INSERT
WITH CHECK (is_admin());

-- Admins can update responses
CREATE POLICY "Admins can update responses"
ON public.ticket_responses
FOR UPDATE
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_ticket_responses_updated_at
BEFORE UPDATE ON public.ticket_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_ticket_responses_ticket_id ON public.ticket_responses(ticket_id);
CREATE INDEX idx_ticket_responses_created_at ON public.ticket_responses(created_at DESC);
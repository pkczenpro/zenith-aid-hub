-- Add attachment_url column to support_tickets table for file uploads
ALTER TABLE public.support_tickets 
ADD COLUMN attachment_url TEXT;

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', false);

-- Create storage policies for ticket attachments
CREATE POLICY "Users can upload their own ticket attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own ticket attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all ticket attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ticket-attachments' AND is_admin());

CREATE POLICY "Admins can upload ticket attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ticket-attachments' AND is_admin());
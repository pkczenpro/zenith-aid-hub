-- Add icon_url column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS icon_url TEXT;
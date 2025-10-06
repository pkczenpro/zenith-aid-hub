-- Add 'sample_report' to the valid resource types
ALTER TABLE product_resources 
DROP CONSTRAINT IF EXISTS product_resources_resource_type_check;

ALTER TABLE product_resources 
ADD CONSTRAINT product_resources_resource_type_check 
CHECK (resource_type IN ('factsheet', 'brochure', 'whitepaper', 'case_study', 'sales_deck', 'video', 'other', 'sample_report'));
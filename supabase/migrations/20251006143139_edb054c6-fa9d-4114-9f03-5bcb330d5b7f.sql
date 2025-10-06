-- Add folder column to product_resources table
ALTER TABLE product_resources 
ADD COLUMN folder text DEFAULT 'General';

-- Create index for better folder filtering performance
CREATE INDEX idx_product_resources_folder ON product_resources(folder);

-- Update existing sample_report resources to be in "Sample Report" folder
UPDATE product_resources 
SET folder = 'Sample Report' 
WHERE resource_type = 'sample_report';
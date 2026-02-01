-- Add source tracking fields to inventory_layers
-- This enables tracking which production runs created which inventory layers

ALTER TABLE inventory_layers ADD COLUMN source_type TEXT;
ALTER TABLE inventory_layers ADD COLUMN source_id INTEGER;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_layers_source ON inventory_layers(source_type, source_id);

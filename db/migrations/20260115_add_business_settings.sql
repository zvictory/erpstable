-- Create business_settings table for business type configuration
CREATE TABLE IF NOT EXISTS business_settings (
    id INTEGER PRIMARY KEY,
    business_type TEXT NOT NULL,
    setup_completed INTEGER NOT NULL DEFAULT 0,
    enabled_modules TEXT NOT NULL DEFAULT '[]',
    customizations TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now'))
);

-- Add index on id for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_settings_id ON business_settings(id);

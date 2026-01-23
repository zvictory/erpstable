-- Add Russian title field to line_issues table
ALTER TABLE line_issues ADD COLUMN title_ru TEXT;

-- For existing records, set title_ru to match title for backwards compatibility
UPDATE line_issues SET title_ru = title WHERE title_ru IS NULL;

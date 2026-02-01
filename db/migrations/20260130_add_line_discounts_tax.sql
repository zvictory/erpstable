-- Migration: Add discount and tax calculation fields to invoice_lines
-- Date: 2026-01-30
-- Purpose: Support line-level discounts and tax calculation for Sales 2.0 Phase 2

-- Add discount and tax fields to invoice_lines
ALTER TABLE invoice_lines ADD COLUMN discount_percent INTEGER DEFAULT 0 NOT NULL;  -- Basis points (1250 = 12.5%)
ALTER TABLE invoice_lines ADD COLUMN discount_amount INTEGER DEFAULT 0 NOT NULL;   -- Tiyin
ALTER TABLE invoice_lines ADD COLUMN tax_amount INTEGER DEFAULT 0 NOT NULL;        -- Tiyin (calculated)

-- Add index for performance on discount queries
CREATE INDEX IF NOT EXISTS idx_invoice_lines_discount ON invoice_lines(discount_amount) WHERE discount_amount > 0;

-- Add check constraint to ensure discounts are non-negative
-- Note: SQLite doesn't support adding constraints to existing tables, so this is a comment for documentation
-- New insertions will be validated at application level via Zod schemas

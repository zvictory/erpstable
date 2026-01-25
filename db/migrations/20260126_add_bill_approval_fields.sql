-- Migration: Add bill approval workflow fields
-- Date: 2026-01-26
-- Purpose: Enable approval workflow for high-value bills (>10M UZS)

-- Add approval workflow fields
ALTER TABLE vendor_bills ADD COLUMN approval_status TEXT DEFAULT 'NOT_REQUIRED'
  CHECK (approval_status IN ('APPROVED', 'PENDING', 'REJECTED', 'NOT_REQUIRED'));
ALTER TABLE vendor_bills ADD COLUMN approved_by INTEGER REFERENCES users(id);
ALTER TABLE vendor_bills ADD COLUMN approved_at INTEGER;

-- Create indexes for efficient querying
CREATE INDEX idx_vendor_bills_approval_status ON vendor_bills(approval_status);
CREATE INDEX idx_vendor_bills_approved_by ON vendor_bills(approved_by);

-- Migration: Add Field Service Module
-- Date: 2026-01-28
-- Description: Creates 5 new tables for field service management:
--   - customer_assets: Installed base registry
--   - service_contracts: AMC/maintenance agreements
--   - contract_refill_items: Refill configuration per contract
--   - service_tickets: Work orders for installations/repairs
--   - service_ticket_assets: Junction table linking tickets to assets
-- Also adds requiresInstallation field to items table

-- 1. Add requiresInstallation field to items table
ALTER TABLE items ADD COLUMN requires_installation INTEGER DEFAULT 0 NOT NULL;

-- 2. Create customer_assets table
CREATE TABLE IF NOT EXISTS customer_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  serial_number TEXT,
  installation_address TEXT,
  invoice_line_id INTEGER REFERENCES invoice_lines(id),
  installation_date INTEGER,
  warranty_end_date INTEGER,
  service_contract_id INTEGER,
  status TEXT DEFAULT 'PENDING_INSTALLATION' NOT NULL CHECK(status IN ('PENDING_INSTALLATION', 'ACTIVE', 'UNDER_SERVICE', 'DECOMMISSIONED')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX customer_assets_customer_idx ON customer_assets(customer_id);
CREATE INDEX customer_assets_status_idx ON customer_assets(status);
CREATE INDEX customer_assets_contract_idx ON customer_assets(service_contract_id);

-- 3. Create service_contracts table
CREATE TABLE IF NOT EXISTS service_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  contract_type TEXT NOT NULL CHECK(contract_type IN ('WARRANTY', 'MAINTENANCE', 'FULL_SERVICE', 'SUPPLIES_ONLY')),
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,
  billing_frequency_months INTEGER NOT NULL,
  next_billing_date INTEGER,
  auto_generate_refills INTEGER DEFAULT 1 NOT NULL,
  monthly_value INTEGER NOT NULL,
  status TEXT DEFAULT 'ACTIVE' NOT NULL CHECK(status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED')),
  suspension_reason TEXT,
  assigned_technician_id INTEGER REFERENCES users(id),
  source_invoice_id INTEGER REFERENCES invoices(id),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX service_contracts_customer_idx ON service_contracts(customer_id);
CREATE INDEX service_contracts_next_billing_date_idx ON service_contracts(next_billing_date);
CREATE INDEX service_contracts_status_idx ON service_contracts(status);

-- 4. Create contract_refill_items table
CREATE TABLE IF NOT EXISTS contract_refill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL REFERENCES service_contracts(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  quantity_per_cycle INTEGER NOT NULL,
  contract_unit_price INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX contract_refill_items_contract_idx ON contract_refill_items(contract_id);
CREATE INDEX contract_refill_items_item_idx ON contract_refill_items(item_id);
CREATE UNIQUE INDEX contract_refill_items_unique_contract_item ON contract_refill_items(contract_id, item_id);

-- 5. Create service_tickets table
CREATE TABLE IF NOT EXISTS service_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  service_contract_id INTEGER REFERENCES service_contracts(id),
  ticket_type TEXT NOT NULL CHECK(ticket_type IN ('INSTALLATION', 'REPAIR', 'MAINTENANCE', 'SUPPORT', 'EMERGENCY')),
  priority TEXT DEFAULT 'MEDIUM' NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date INTEGER,
  actual_start_time INTEGER,
  actual_end_time INTEGER,
  assigned_technician_id INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'OPEN' NOT NULL CHECK(status IN ('OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  completion_notes TEXT,
  customer_signature TEXT,
  is_billable INTEGER DEFAULT 0 NOT NULL,
  labor_hours_decimal INTEGER DEFAULT 0 NOT NULL,
  parts_used TEXT,
  service_invoice_id INTEGER REFERENCES invoices(id),
  source_invoice_id INTEGER REFERENCES invoices(id),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX service_tickets_customer_idx ON service_tickets(customer_id);
CREATE INDEX service_tickets_status_idx ON service_tickets(status);
CREATE INDEX service_tickets_technician_idx ON service_tickets(assigned_technician_id);
CREATE INDEX service_tickets_scheduled_date_idx ON service_tickets(scheduled_date);

-- 6. Create service_ticket_assets table
CREATE TABLE IF NOT EXISTS service_ticket_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  asset_id INTEGER NOT NULL REFERENCES customer_assets(id),
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX service_ticket_assets_ticket_idx ON service_ticket_assets(ticket_id);
CREATE INDEX service_ticket_assets_asset_idx ON service_ticket_assets(asset_id);

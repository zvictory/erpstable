-- Migration: Fix TEXT timestamps to INTEGER timestamps
-- Generated: 2026-02-01T09:53:20.890Z
-- Affected rows: 807
-- Affected tables: 26
--
-- Issue: SQLite CURRENT_TIMESTAMP returns TEXT format: "2026-01-29 17:21:58"
-- Schema expects: INTEGER Unix epoch format: 1738170118
-- Solution: Convert TEXT timestamps to Unix epoch using strftime('%s', column_name)

BEGIN TRANSACTION;

-- Convert activities.created_at from TEXT to INTEGER
UPDATE activities
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert activities.updated_at from TEXT to INTEGER
UPDATE activities
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert analytic_accounts.created_at from TEXT to INTEGER
UPDATE analytic_accounts
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert analytic_accounts.updated_at from TEXT to INTEGER
UPDATE analytic_accounts
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert audit_logs.created_at from TEXT to INTEGER
UPDATE audit_logs
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert bank_statements.created_at from TEXT to INTEGER
UPDATE bank_statements
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert bank_statements.updated_at from TEXT to INTEGER
UPDATE bank_statements
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert bom_headers.created_at from TEXT to INTEGER
UPDATE bom_headers
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert bom_headers.updated_at from TEXT to INTEGER
UPDATE bom_headers
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert bom_items.created_at from TEXT to INTEGER
UPDATE bom_items
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert bom_items.updated_at from TEXT to INTEGER
UPDATE bom_items
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert business_settings.created_at from TEXT to INTEGER
UPDATE business_settings
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert business_settings.updated_at from TEXT to INTEGER
UPDATE business_settings
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert categories.created_at from TEXT to INTEGER
UPDATE categories
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert categories.updated_at from TEXT to INTEGER
UPDATE categories
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert commission_rules.created_at from TEXT to INTEGER
UPDATE commission_rules
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert commission_rules.updated_at from TEXT to INTEGER
UPDATE commission_rules
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert commissions.created_at from TEXT to INTEGER
UPDATE commissions
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert commissions.updated_at from TEXT to INTEGER
UPDATE commissions
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert contract_refill_items.created_at from TEXT to INTEGER
UPDATE contract_refill_items
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert contract_refill_items.updated_at from TEXT to INTEGER
UPDATE contract_refill_items
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert customer_assets.created_at from TEXT to INTEGER
UPDATE customer_assets
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert customer_assets.updated_at from TEXT to INTEGER
UPDATE customer_assets
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert customer_payments.created_at from TEXT to INTEGER
UPDATE customer_payments
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert customer_payments.updated_at from TEXT to INTEGER
UPDATE customer_payments
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert customers.created_at from TEXT to INTEGER
UPDATE customers
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert customers.updated_at from TEXT to INTEGER
UPDATE customers
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert deals.created_at from TEXT to INTEGER
UPDATE deals
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert deals.updated_at from TEXT to INTEGER
UPDATE deals
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert depreciation_entries.created_at from TEXT to INTEGER
UPDATE depreciation_entries
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert depreciation_entries.updated_at from TEXT to INTEGER
UPDATE depreciation_entries
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert downtime_events.created_at from TEXT to INTEGER
UPDATE downtime_events
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert downtime_events.updated_at from TEXT to INTEGER
UPDATE downtime_events
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert downtime_reason_codes.created_at from TEXT to INTEGER
UPDATE downtime_reason_codes
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert employee_compensation.created_at from TEXT to INTEGER
UPDATE employee_compensation
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert equipment_units.created_at from TEXT to INTEGER
UPDATE equipment_units
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert equipment_units.updated_at from TEXT to INTEGER
UPDATE equipment_units
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert expense_categories.created_at from TEXT to INTEGER
UPDATE expense_categories
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert expense_categories.updated_at from TEXT to INTEGER
UPDATE expense_categories
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert expenses.created_at from TEXT to INTEGER
UPDATE expenses
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert expenses.updated_at from TEXT to INTEGER
UPDATE expenses
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert fixed_assets.created_at from TEXT to INTEGER
UPDATE fixed_assets
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert fixed_assets.updated_at from TEXT to INTEGER
UPDATE fixed_assets
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert gl_accounts.created_at from TEXT to INTEGER
UPDATE gl_accounts
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert gl_accounts.updated_at from TEXT to INTEGER
UPDATE gl_accounts
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert goods_received_notes.created_at from TEXT to INTEGER
UPDATE goods_received_notes
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert goods_received_notes.updated_at from TEXT to INTEGER
UPDATE goods_received_notes
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert inspection_orders.created_at from TEXT to INTEGER
UPDATE inspection_orders
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert inspection_orders.updated_at from TEXT to INTEGER
UPDATE inspection_orders
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert inspection_results.created_at from TEXT to INTEGER
UPDATE inspection_results
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert inspection_results.updated_at from TEXT to INTEGER
UPDATE inspection_results
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert inventory_adjustments.created_at from TEXT to INTEGER
UPDATE inventory_adjustments
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert inventory_adjustments.updated_at from TEXT to INTEGER
UPDATE inventory_adjustments
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert inventory_layers.created_at from TEXT to INTEGER
UPDATE inventory_layers
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert inventory_layers.updated_at from TEXT to INTEGER
UPDATE inventory_layers
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert inventory_location_transfers.created_at from TEXT to INTEGER
UPDATE inventory_location_transfers
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert inventory_location_transfers.updated_at from TEXT to INTEGER
UPDATE inventory_location_transfers
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert inventory_reserves.created_at from TEXT to INTEGER
UPDATE inventory_reserves
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert inventory_reserves.updated_at from TEXT to INTEGER
UPDATE inventory_reserves
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert inventory_transactions.created_at from TEXT to INTEGER
UPDATE inventory_transactions
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert inventory_transactions.updated_at from TEXT to INTEGER
UPDATE inventory_transactions
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert invoice_lines.created_at from TEXT to INTEGER
UPDATE invoice_lines
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert invoice_lines.updated_at from TEXT to INTEGER
UPDATE invoice_lines
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert invoices.created_at from TEXT to INTEGER
UPDATE invoices
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert invoices.updated_at from TEXT to INTEGER
UPDATE invoices
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert items.created_at from TEXT to INTEGER
UPDATE items
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert items.updated_at from TEXT to INTEGER
UPDATE items
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert journal_entries.created_at from TEXT to INTEGER
UPDATE journal_entries
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert journal_entries.updated_at from TEXT to INTEGER
UPDATE journal_entries
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert landed_cost_allocations.created_at from TEXT to INTEGER
UPDATE landed_cost_allocations
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert landed_cost_allocations.updated_at from TEXT to INTEGER
UPDATE landed_cost_allocations
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert leads.created_at from TEXT to INTEGER
UPDATE leads
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert leads.updated_at from TEXT to INTEGER
UPDATE leads
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert line_issues.updated_at from TEXT to INTEGER
UPDATE line_issues
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert maintenance_events.created_at from TEXT to INTEGER
UPDATE maintenance_events
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert maintenance_events.updated_at from TEXT to INTEGER
UPDATE maintenance_events
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert maintenance_schedules.created_at from TEXT to INTEGER
UPDATE maintenance_schedules
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert maintenance_schedules.updated_at from TEXT to INTEGER
UPDATE maintenance_schedules
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert notifications.created_at from TEXT to INTEGER
UPDATE notifications
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert notifications.updated_at from TEXT to INTEGER
UPDATE notifications
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert operator_performance_snapshots.created_at from TEXT to INTEGER
UPDATE operator_performance_snapshots
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert operator_performance_snapshots.updated_at from TEXT to INTEGER
UPDATE operator_performance_snapshots
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert password_reset_tokens.created_at from TEXT to INTEGER
UPDATE password_reset_tokens
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert password_reset_tokens.updated_at from TEXT to INTEGER
UPDATE password_reset_tokens
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert payment_allocations.created_at from TEXT to INTEGER
UPDATE payment_allocations
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert payment_allocations.updated_at from TEXT to INTEGER
UPDATE payment_allocations
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert payroll_periods.created_at from TEXT to INTEGER
UPDATE payroll_periods
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert payroll_periods.updated_at from TEXT to INTEGER
UPDATE payroll_periods
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert payslip_items.created_at from TEXT to INTEGER
UPDATE payslip_items
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert payslips.created_at from TEXT to INTEGER
UPDATE payslips
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert payslips.updated_at from TEXT to INTEGER
UPDATE payslips
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert price_list_rules.created_at from TEXT to INTEGER
UPDATE price_list_rules
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert price_list_rules.updated_at from TEXT to INTEGER
UPDATE price_list_rules
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert price_lists.created_at from TEXT to INTEGER
UPDATE price_lists
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert price_lists.updated_at from TEXT to INTEGER
UPDATE price_lists
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert process_readings.created_at from TEXT to INTEGER
UPDATE process_readings
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_costs.created_at from TEXT to INTEGER
UPDATE production_costs
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_costs.updated_at from TEXT to INTEGER
UPDATE production_costs
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert production_inputs.created_at from TEXT to INTEGER
UPDATE production_inputs
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_inputs.updated_at from TEXT to INTEGER
UPDATE production_inputs
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert production_labor_logs.created_at from TEXT to INTEGER
UPDATE production_labor_logs
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_labor_logs.updated_at from TEXT to INTEGER
UPDATE production_labor_logs
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert production_line_kpi_snapshots.created_at from TEXT to INTEGER
UPDATE production_line_kpi_snapshots
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_line_kpi_snapshots.updated_at from TEXT to INTEGER
UPDATE production_line_kpi_snapshots
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert production_outputs.created_at from TEXT to INTEGER
UPDATE production_outputs
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_outputs.updated_at from TEXT to INTEGER
UPDATE production_outputs
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert production_run_chain_members.created_at from TEXT to INTEGER
UPDATE production_run_chain_members
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_run_chains.created_at from TEXT to INTEGER
UPDATE production_run_chains
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_run_chains.updated_at from TEXT to INTEGER
UPDATE production_run_chains
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert production_run_dependencies.created_at from TEXT to INTEGER
UPDATE production_run_dependencies
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_run_dependencies.updated_at from TEXT to INTEGER
UPDATE production_run_dependencies
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert production_run_steps.created_at from TEXT to INTEGER
UPDATE production_run_steps
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_run_steps.updated_at from TEXT to INTEGER
UPDATE production_run_steps
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert production_runs.created_at from TEXT to INTEGER
UPDATE production_runs
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert production_runs.updated_at from TEXT to INTEGER
UPDATE production_runs
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert purchase_orders.created_at from TEXT to INTEGER
UPDATE purchase_orders
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert purchase_orders.updated_at from TEXT to INTEGER
UPDATE purchase_orders
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert quality_tests.created_at from TEXT to INTEGER
UPDATE quality_tests
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert quality_tests.updated_at from TEXT to INTEGER
UPDATE quality_tests
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert recipe_items.created_at from TEXT to INTEGER
UPDATE recipe_items
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert recipe_items.updated_at from TEXT to INTEGER
UPDATE recipe_items
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert recipes.created_at from TEXT to INTEGER
UPDATE recipes
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert recipes.updated_at from TEXT to INTEGER
UPDATE recipes
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert routing_steps.created_at from TEXT to INTEGER
UPDATE routing_steps
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert routing_steps.updated_at from TEXT to INTEGER
UPDATE routing_steps
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert routings.created_at from TEXT to INTEGER
UPDATE routings
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert routings.updated_at from TEXT to INTEGER
UPDATE routings
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert service_contracts.created_at from TEXT to INTEGER
UPDATE service_contracts
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert service_contracts.updated_at from TEXT to INTEGER
UPDATE service_contracts
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert service_ticket_assets.created_at from TEXT to INTEGER
UPDATE service_ticket_assets
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert service_ticket_assets.updated_at from TEXT to INTEGER
UPDATE service_ticket_assets
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert service_tickets.created_at from TEXT to INTEGER
UPDATE service_tickets
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert service_tickets.updated_at from TEXT to INTEGER
UPDATE service_tickets
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert statement_lines.created_at from TEXT to INTEGER
UPDATE statement_lines
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert statement_lines.updated_at from TEXT to INTEGER
UPDATE statement_lines
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert stock_reservations.created_at from TEXT to INTEGER
UPDATE stock_reservations
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert stock_reservations.updated_at from TEXT to INTEGER
UPDATE stock_reservations
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert system_settings.updated_at from TEXT to INTEGER
UPDATE system_settings
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert tax_groups.created_at from TEXT to INTEGER
UPDATE tax_groups
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert tax_groups.updated_at from TEXT to INTEGER
UPDATE tax_groups
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert tax_rates.created_at from TEXT to INTEGER
UPDATE tax_rates
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert tax_rates.updated_at from TEXT to INTEGER
UPDATE tax_rates
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert uom_conversions.created_at from TEXT to INTEGER
UPDATE uom_conversions
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert uom_conversions.updated_at from TEXT to INTEGER
UPDATE uom_conversions
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert uoms.created_at from TEXT to INTEGER
UPDATE uoms
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert uoms.updated_at from TEXT to INTEGER
UPDATE uoms
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert users.created_at from TEXT to INTEGER
UPDATE users
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert users.updated_at from TEXT to INTEGER
UPDATE users
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert vendor_bill_lines.created_at from TEXT to INTEGER
UPDATE vendor_bill_lines
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert vendor_bills.created_at from TEXT to INTEGER
UPDATE vendor_bills
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert vendor_bills.updated_at from TEXT to INTEGER
UPDATE vendor_bills
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert vendor_payment_allocations.created_at from TEXT to INTEGER
UPDATE vendor_payment_allocations
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert vendor_payment_allocations.updated_at from TEXT to INTEGER
UPDATE vendor_payment_allocations
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert vendor_payments.created_at from TEXT to INTEGER
UPDATE vendor_payments
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert vendor_payments.updated_at from TEXT to INTEGER
UPDATE vendor_payments
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert vendors.created_at from TEXT to INTEGER
UPDATE vendors
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert vendors.updated_at from TEXT to INTEGER
UPDATE vendors
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert warehouse_locations.created_at from TEXT to INTEGER
UPDATE warehouse_locations
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert warehouse_locations.updated_at from TEXT to INTEGER
UPDATE warehouse_locations
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert warehouses.created_at from TEXT to INTEGER
UPDATE warehouses
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert warehouses.updated_at from TEXT to INTEGER
UPDATE warehouses
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert work_centers.created_at from TEXT to INTEGER
UPDATE work_centers
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert work_centers.updated_at from TEXT to INTEGER
UPDATE work_centers
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert work_order_step_costs.created_at from TEXT to INTEGER
UPDATE work_order_step_costs
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert work_order_step_costs.updated_at from TEXT to INTEGER
UPDATE work_order_step_costs
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert work_order_step_status.created_at from TEXT to INTEGER
UPDATE work_order_step_status
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert work_order_step_status.updated_at from TEXT to INTEGER
UPDATE work_order_step_status
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert work_order_steps.created_at from TEXT to INTEGER
UPDATE work_order_steps
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert work_order_steps.updated_at from TEXT to INTEGER
UPDATE work_order_steps
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

-- Convert work_orders.created_at from TEXT to INTEGER
UPDATE work_orders
SET created_at = CAST(strftime('%s', created_at) AS INTEGER)
WHERE typeof(created_at) = 'text';

-- Convert work_orders.updated_at from TEXT to INTEGER
UPDATE work_orders
SET updated_at = CAST(strftime('%s', updated_at) AS INTEGER)
WHERE typeof(updated_at) = 'text';

COMMIT;

-- Verification Queries (run these to verify migration success)
-- SELECT 'Migration complete!' as status;
-- SELECT table_name, COUNT(*) as remaining_text_timestamps
-- FROM (
--   SELECT 'items' as table_name FROM items WHERE typeof(created_at) = 'text'
--   UNION ALL
--   SELECT 'inspection_orders' as table_name FROM inspection_orders WHERE typeof(created_at) = 'text'
--   -- ... and so on for all affected tables
-- )
-- GROUP BY table_name;

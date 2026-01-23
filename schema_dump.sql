CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE IF NOT EXISTS "__old_push_items" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`description` text,
	`type` text DEFAULT 'Inventory' NOT NULL,
	`category` text DEFAULT 'Raw Materials' NOT NULL,
	`parent_id` integer,
	`base_uom_id` integer NOT NULL,
	`purchase_uom_id` integer,
	`standard_cost` integer DEFAULT 0,
	`sales_price` integer DEFAULT 0,
	`reorder_point` integer DEFAULT 0,
	`income_account_code` text,
	`is_active` integer DEFAULT true,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`base_uom_id`) REFERENCES `uoms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_uom_id`) REFERENCES `uoms`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `uom_conversions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_uom_id` integer NOT NULL,
	`to_uom_id` integer NOT NULL,
	`factor` integer NOT NULL,
	`conversion_factor` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`from_uom_id`) REFERENCES `uoms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_uom_id`) REFERENCES `uoms`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `uoms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
, precision INTEGER NOT NULL DEFAULT 2, is_active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE `routing_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routing_id` integer NOT NULL,
	`step_order` integer NOT NULL,
	`work_center_id` integer NOT NULL,
	`description` text NOT NULL,
	`setup_time_minutes` integer DEFAULT 0,
	`run_time_per_unit_minutes` integer DEFAULT 0,
	`expected_yield_percent` integer DEFAULT 10000 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`routing_id`) REFERENCES `routings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_center_id`) REFERENCES `work_centers`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `routings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`item_id` integer,
	`description` text,
	`is_active` integer DEFAULT true,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES "__old_push_items"(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `work_centers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`location` text,
	`cost_per_hour` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `work_order_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_order_id` integer NOT NULL,
	`routing_step_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`qty_in` integer DEFAULT 0,
	`qty_out` integer DEFAULT 0,
	`qty_scrap` integer DEFAULT 0,
	`actual_yield_percent` integer DEFAULT 0,
	`start_time` integer,
	`end_time` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routing_step_id`) REFERENCES `routing_steps`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `work_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`item_id` integer NOT NULL,
	`routing_id` integer NOT NULL,
	`qty_planned` integer NOT NULL,
	`qty_produced` integer DEFAULT 0,
	`qty_rejected` integer DEFAULT 0,
	`status` text DEFAULT 'draft' NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES "__old_push_items"(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routing_id`) REFERENCES `routings`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `bom_headers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`name` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES "__old_push_items"(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `bom_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bom_id` integer NOT NULL,
	`routing_step_id` integer,
	`component_item_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`scrap_factor_percent` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`bom_id`) REFERENCES `bom_headers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routing_step_id`) REFERENCES `routing_steps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`component_item_id`) REFERENCES "__old_push_items"(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `gl_accounts` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`parent_code` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
, balance INTEGER DEFAULT 0);
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` integer NOT NULL,
	`description` text NOT NULL,
	`reference` text,
	`is_posted` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
, transaction_id TEXT);
CREATE TABLE `journal_entry_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journal_entry_id` integer NOT NULL,
	`account_code` text NOT NULL,
	`debit` integer DEFAULT 0 NOT NULL,
	`credit` integer DEFAULT 0 NOT NULL,
	`description` text,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_code`) REFERENCES `gl_accounts`(`code`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `system_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`lock_date` integer,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `purchase_order_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`po_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`qty_ordered` integer NOT NULL,
	`qty_received` integer DEFAULT 0 NOT NULL,
	`unit_cost` integer NOT NULL,
	`description` text,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES "__old_push_items"(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `purchase_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vendor_id` integer NOT NULL,
	`date` integer NOT NULL,
	`expected_date` integer,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`order_number` text NOT NULL,
	`notes` text,
	`total_amount` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `vendor_bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vendor_id` integer NOT NULL,
	`po_id` integer,
	`bill_date` integer NOT NULL,
	`due_date` integer,
	`bill_number` text,
	`total_amount` integer NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `vendors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tax_id` text,
	`email` text,
	`phone` text,
	`address` text,
	`currency` text DEFAULT 'UZS' NOT NULL,
	`payment_terms` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `production_costs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`cost_type` text NOT NULL,
	`amount` integer NOT NULL,
	`description` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `production_runs`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `production_inputs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`qty` real NOT NULL,
	`cost_basis` integer NOT NULL,
	`total_cost` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `production_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES "__old_push_items"(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `production_outputs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`qty` real NOT NULL,
	`unit_cost` integer NOT NULL,
	`batch_number` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `production_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES "__old_push_items"(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `production_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` integer NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`type` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `customer_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`date` integer NOT NULL,
	`amount` integer NOT NULL,
	`payment_method` text DEFAULT 'CASH' NOT NULL,
	`reference` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tax_id` text,
	`email` text,
	`phone` text,
	`address` text,
	`credit_limit` integer DEFAULT 0 NOT NULL,
	`last_interaction_at` integer,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `invoice_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`description` text,
	`quantity` integer NOT NULL,
	`rate` integer NOT NULL,
	`amount` integer NOT NULL,
	`revenue_account_id` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES "__old_push_items"(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`date` integer NOT NULL,
	`due_date` integer NOT NULL,
	`invoice_number` text NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`tax_total` integer DEFAULT 0 NOT NULL,
	`total_amount` integer NOT NULL,
	`balance_remaining` integer NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `payment_allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payment_id` integer NOT NULL,
	`invoice_id` integer NOT NULL,
	`amount_applied` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `customer_payments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `items_sku_unique` ON "__old_push_items" (`sku`);
CREATE UNIQUE INDEX `unique_conversion_idx` ON `uom_conversions` (`from_uom_id`,`to_uom_id`);
CREATE UNIQUE INDEX `uoms_name_unique` ON `uoms` (`name`);
CREATE UNIQUE INDEX `uoms_code_unique` ON `uoms` (`code`);
CREATE UNIQUE INDEX `work_centers_code_unique` ON `work_centers` (`code`);
CREATE UNIQUE INDEX `work_orders_order_number_unique` ON `work_orders` (`order_number`);
CREATE INDEX `je_date_idx` ON `journal_entries` (`date`);
CREATE UNIQUE INDEX `system_settings_key_unique` ON `system_settings` (`key`);
CREATE UNIQUE INDEX `purchase_orders_order_number_unique` ON `purchase_orders` (`order_number`);
CREATE INDEX `pmt_customer_id_idx` ON `customer_payments` (`customer_id`);
CREATE INDEX `inv_lines_invoice_id_idx` ON `invoice_lines` (`invoice_id`);
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);
CREATE INDEX `inv_customer_id_idx` ON `invoices` (`customer_id`);
CREATE INDEX `inv_date_idx` ON `invoices` (`date`);
CREATE INDEX `alloc_payment_id_idx` ON `payment_allocations` (`payment_id`);
CREATE INDEX `alloc_invoice_id_idx` ON `payment_allocations` (`invoice_id`);
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`record_id` integer NOT NULL,
	`action` text NOT NULL,
	`user_id` text,
	`changes` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `inventory_layers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`batch_number` text NOT NULL,
	`initial_qty` integer NOT NULL,
	`remaining_qty` integer NOT NULL,
	`unit_cost` integer NOT NULL,
	`is_depleted` integer DEFAULT false,
	`version` integer DEFAULT 1 NOT NULL,
	`receive_date` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES "__old_push_items"(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `item_batch_idx` ON `inventory_layers` (`item_id`,`batch_number`);
CREATE INDEX `fifo_idx` ON `inventory_layers` (`item_id`,`receive_date`);
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`description` text,
	`type` text DEFAULT 'Inventory' NOT NULL,
	`category` text DEFAULT 'Raw Materials' NOT NULL,
	`parent_id` integer,
	`base_uom_id` integer NOT NULL,
	`purchase_uom_id` integer,
	`standard_cost` integer DEFAULT 0,
	`sales_price` integer DEFAULT 0,
	`reorder_point` integer DEFAULT 0,
	`income_account_code` text,
	`is_active` integer DEFAULT true,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`base_uom_id`) REFERENCES `uoms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_uom_id`) REFERENCES `uoms`(`id`) ON UPDATE no action ON DELETE no action
);

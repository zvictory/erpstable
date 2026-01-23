CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`record_id` integer NOT NULL,
	`action` text NOT NULL,
	`user_id` text,
	`changes` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
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
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`description` text,
	`base_uom_id` integer NOT NULL,
	`purchase_uom_id` integer,
	`standard_cost` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`base_uom_id`) REFERENCES `uoms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_uom_id`) REFERENCES `uoms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `uoms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `routings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`item_id` integer,
	`description` text,
	`is_active` integer DEFAULT true,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routing_id`) REFERENCES `routings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bom_headers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`name` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
	FOREIGN KEY (`component_item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gl_accounts` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`parent_code` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` integer NOT NULL,
	`description` text NOT NULL,
	`reference` text,
	`is_posted` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`lock_date` integer,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchase_order_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`po_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`qty_ordered` integer NOT NULL,
	`qty_received` integer DEFAULT 0 NOT NULL,
	`unit_cost` integer NOT NULL,
	`description` text,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE INDEX `item_batch_idx` ON `inventory_layers` (`item_id`,`batch_number`);--> statement-breakpoint
CREATE INDEX `fifo_idx` ON `inventory_layers` (`item_id`,`receive_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `items_sku_unique` ON `items` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_conversion_idx` ON `uom_conversions` (`from_uom_id`,`to_uom_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uoms_name_unique` ON `uoms` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `uoms_code_unique` ON `uoms` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `work_centers_code_unique` ON `work_centers` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `work_orders_order_number_unique` ON `work_orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `je_date_idx` ON `journal_entries` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `system_settings_key_unique` ON `system_settings` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_order_number_unique` ON `purchase_orders` (`order_number`);
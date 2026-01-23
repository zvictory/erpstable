CREATE TABLE `customer_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`date` integer NOT NULL,
	`amount` integer NOT NULL,
	`reference` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`date` integer NOT NULL,
	`due_date` integer NOT NULL,
	`invoice_number` text NOT NULL,
	`total_amount` integer NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pmt_customer_id_idx` ON `customer_payments` (`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `inv_customer_id_idx` ON `invoices` (`customer_id`);--> statement-breakpoint
CREATE INDEX `inv_date_idx` ON `invoices` (`date`);
CREATE TABLE `vendor_bill_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bill_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`description` text,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`amount` integer NOT NULL,
	`line_number` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`bill_id`) REFERENCES `vendor_bills`(`id`) ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`)
);
--> statement-breakpoint
CREATE INDEX `vendor_bill_lines_bill_id_idx` on `vendor_bill_lines` (`bill_id`);--> statement-breakpoint
CREATE INDEX `vendor_bill_lines_item_id_idx` on `vendor_bill_lines` (`item_id`);

-- Add assetId to vendor_bill_lines
ALTER TABLE `vendor_bill_lines` ADD COLUMN `asset_id` integer;
--> statement-breakpoint

-- Create fixed_assets table
CREATE TABLE `fixed_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`asset_number` text NOT NULL UNIQUE,
	`asset_type` text NOT NULL,
	`cost` integer NOT NULL,
	`salvage_value` integer NOT NULL DEFAULT 0,
	`accumulated_depreciation` integer NOT NULL DEFAULT 0,
	`depreciation_method` text NOT NULL DEFAULT 'STRAIGHT_LINE',
	`useful_life_months` integer NOT NULL,
	`purchase_date` integer NOT NULL,
	`disposal_date` integer,
	`status` text NOT NULL DEFAULT 'ACTIVE',
	`asset_account_code` text NOT NULL,
	`depreciation_expense_account_code` text NOT NULL,
	`accumulated_depreciation_account_code` text NOT NULL,
	`vendor_bill_line_id` integer,
	`version` integer NOT NULL DEFAULT 1,
	`is_active` integer NOT NULL DEFAULT 1,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`asset_account_code`) REFERENCES `gl_accounts`(`code`),
	FOREIGN KEY (`depreciation_expense_account_code`) REFERENCES `gl_accounts`(`code`),
	FOREIGN KEY (`accumulated_depreciation_account_code`) REFERENCES `gl_accounts`(`code`),
	FOREIGN KEY (`vendor_bill_line_id`) REFERENCES `vendor_bill_lines`(`id`)
);
--> statement-breakpoint

-- Create depreciation_entries table
CREATE TABLE `depreciation_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`period_year` integer NOT NULL,
	`period_month` integer NOT NULL,
	`depreciation_amount` integer NOT NULL,
	`accumulated_depreciation_before` integer NOT NULL,
	`accumulated_depreciation_after` integer NOT NULL,
	`book_value` integer NOT NULL,
	`journal_entry_id` integer,
	`status` text NOT NULL DEFAULT 'CALCULATED',
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`asset_id`) REFERENCES `fixed_assets`(`id`),
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`)
);
--> statement-breakpoint

-- Create indexes for fixed_assets
CREATE INDEX `fa_asset_number_idx` on `fixed_assets` (`asset_number`);
--> statement-breakpoint
CREATE INDEX `fa_status_idx` on `fixed_assets` (`status`);
--> statement-breakpoint
CREATE INDEX `fa_purchase_date_idx` on `fixed_assets` (`purchase_date`);
--> statement-breakpoint

-- Create indexes for depreciation_entries
CREATE UNIQUE INDEX `de_asset_period_unique_idx` on `depreciation_entries` (`asset_id`, `period_year`, `period_month`);
--> statement-breakpoint
CREATE INDEX `de_asset_idx` on `depreciation_entries` (`asset_id`);
--> statement-breakpoint
CREATE INDEX `de_period_idx` on `depreciation_entries` (`period_year`, `period_month`);
--> statement-breakpoint
CREATE INDEX `de_journal_entry_idx` on `depreciation_entries` (`journal_entry_id`);

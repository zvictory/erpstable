ALTER TABLE items ADD `status` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE vendors ADD `status` text DEFAULT 'ACTIVE' NOT NULL;
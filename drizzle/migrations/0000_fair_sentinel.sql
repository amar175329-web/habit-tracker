CREATE TABLE `daily_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_logs_date_unique` ON `daily_logs` (`date`);--> statement-breakpoint
CREATE INDEX `daily_logs_date_idx` ON `daily_logs` (`date`);--> statement-breakpoint
CREATE TABLE `habit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`habit_id` text NOT NULL,
	`date` text NOT NULL,
	`state` integer NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habit_logs_habit_date_idx` ON `habit_logs` (`habit_id`,`date`);--> statement-breakpoint
CREATE INDEX `habit_logs_date_idx` ON `habit_logs` (`date`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer NOT NULL,
	`color_full` text DEFAULT '#22c55e' NOT NULL,
	`color_light` text DEFAULT '#86efac' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sleep_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`bed_at` text NOT NULL,
	`wake_at` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sleep_logs_date_unique` ON `sleep_logs` (`date`);--> statement-breakpoint
CREATE INDEX `sleep_logs_date_idx` ON `sleep_logs` (`date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`timezone` text DEFAULT 'Asia/Kolkata' NOT NULL,
	`created_at` text NOT NULL
);

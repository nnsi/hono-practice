CREATE TABLE "admin_user_deletion_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deleted_user_id" uuid NOT NULL,
	"deleted_login_id" text NOT NULL,
	"deleted_name" text,
	"performed_by_admin_email" text NOT NULL,
	"deletion_counts" jsonb NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_history_archive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_history_id" uuid NOT NULL,
	"original_subscription_id" uuid NOT NULL,
	"deleted_user_id" uuid NOT NULL,
	"deleted_login_id" text NOT NULL,
	"event_type" text NOT NULL,
	"plan" text NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"webhook_id" text,
	"original_created_at" timestamp with time zone NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_user_deletion_log_deleted_user_idx" ON "admin_user_deletion_log" USING btree ("deleted_user_id");--> statement-breakpoint
CREATE INDEX "admin_user_deletion_log_deleted_at_idx" ON "admin_user_deletion_log" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "subscription_history_archive_deleted_user_idx" ON "subscription_history_archive" USING btree ("deleted_user_id");
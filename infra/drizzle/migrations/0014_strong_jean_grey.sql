CREATE TABLE "sync_metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"last_synced_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"retry_count" numeric DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"operation" text NOT NULL,
	"payload" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"sequence_number" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sync_metadata_user_id_idx" ON "sync_metadata" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sync_metadata_entity_idx" ON "sync_metadata" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "sync_metadata_status_idx" ON "sync_metadata" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_queue_user_id_idx" ON "sync_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sync_queue_sequence_idx" ON "sync_queue" USING btree ("user_id","sequence_number");--> statement-breakpoint
CREATE INDEX "sync_queue_timestamp_idx" ON "sync_queue" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "sync_queue_entity_idx" ON "sync_queue" USING btree ("entity_type","entity_id");
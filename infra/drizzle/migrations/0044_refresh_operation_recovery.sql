ALTER TABLE "refresh_token" ADD COLUMN "family_id" uuid;--> statement-breakpoint
ALTER TABLE "refresh_token" ADD COLUMN "rotation_operation_hash" text;--> statement-breakpoint
ALTER TABLE "refresh_token" ADD COLUMN "rotation_child_id" uuid;--> statement-breakpoint
ALTER TABLE "refresh_token" ADD COLUMN "rotation_recovery_expires_at" timestamp with time zone;--> statement-breakpoint
UPDATE "refresh_token" SET "family_id" = "id";--> statement-breakpoint
CREATE INDEX "refresh_token_family_id_idx" ON "refresh_token" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_token_rotation_operation_hash_idx" ON "refresh_token" USING btree ("rotation_operation_hash");

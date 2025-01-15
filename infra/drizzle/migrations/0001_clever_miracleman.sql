ALTER TABLE "activity" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activity" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_kind" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_kind" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_quantity_options" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_quantity_options" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ALTER COLUMN "done" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "activity_user_id_idx" ON "activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_created_at_idx" ON "activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_kind_activity_id_idx" ON "activity_kind" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "activity_log_activity_id_idx" ON "activity_log" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "activity_log_activity_kind_id_idx" ON "activity_log" USING btree ("activity_kind_id");--> statement-breakpoint
CREATE INDEX "activity_log_date_idx" ON "activity_log" USING btree ("date");--> statement-breakpoint
CREATE INDEX "task_user_id_idx" ON "task" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_created_at_idx" ON "task" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_login_id_idx" ON "user" USING btree ("login_id");
ALTER TABLE "activity_log" ADD COLUMN "task_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_task_id_idx" ON "activity_log" USING btree ("task_id");
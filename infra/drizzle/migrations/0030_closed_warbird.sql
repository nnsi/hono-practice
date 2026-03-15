ALTER TABLE "task" ADD COLUMN "activity_kind_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "quantity" numeric;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_activity_kind_id_activity_kind_id_fk" FOREIGN KEY ("activity_kind_id") REFERENCES "public"."activity_kind"("id") ON DELETE no action ON UPDATE no action;
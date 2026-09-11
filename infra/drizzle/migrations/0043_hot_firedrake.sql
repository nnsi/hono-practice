CREATE TABLE "task_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_id" uuid,
	"activity_kind_id" uuid,
	"quantity" numeric,
	"title" text NOT NULL,
	"memo" text DEFAULT '',
	"recurrence_type" text NOT NULL,
	"interval_days" integer,
	"weekdays" jsonb,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "schedule_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "scheduled_date" date;--> statement-breakpoint
ALTER TABLE "task_schedule" ADD CONSTRAINT "task_schedule_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_schedule" ADD CONSTRAINT "task_schedule_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_schedule" ADD CONSTRAINT "task_schedule_activity_kind_id_activity_kind_id_fk" FOREIGN KEY ("activity_kind_id") REFERENCES "public"."activity_kind"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_schedule_user_id_updated_at_idx" ON "task_schedule" USING btree ("user_id","updated_at");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_schedule_id_task_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."task_schedule"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_schedule_id_scheduled_date_idx" ON "task" USING btree ("schedule_id","scheduled_date");
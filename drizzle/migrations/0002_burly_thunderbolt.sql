CREATE TABLE "goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_goal_id" uuid,
	"title" text NOT NULL,
	"unit" text,
	"quantity" numeric,
	"current_quantity" numeric,
	"emoji" text,
	"start_date" date,
	"due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "activity_quantity_options" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "activity_quantity_options" CASCADE;--> statement-breakpoint
ALTER TABLE "activity" RENAME COLUMN "quantity_label" TO "quantity_unit";--> statement-breakpoint
ALTER TABLE "activity" DROP CONSTRAINT "activity_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_kind" DROP CONSTRAINT "activity_kind_activity_id_activity_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_activity_id_activity_id_fk";
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "task_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_log" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ALTER COLUMN "quantity" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_parent_goal_id_goal_id_fk" FOREIGN KEY ("parent_goal_id") REFERENCES "public"."goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goal_user_id_idx" ON "goal" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goal_parent_goal_id_idx" ON "goal" USING btree ("parent_goal_id");--> statement-breakpoint
CREATE INDEX "goal_created_at_idx" ON "goal" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_kind" ADD CONSTRAINT "activity_kind_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
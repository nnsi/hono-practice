CREATE TABLE "activity_goal_freeze_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "activity_goal_freeze_period" ADD CONSTRAINT "activity_goal_freeze_period_goal_id_activity_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."activity_goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_goal_freeze_period" ADD CONSTRAINT "activity_goal_freeze_period_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_goal_freeze_period_goal_id_idx" ON "activity_goal_freeze_period" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "activity_goal_freeze_period_user_id_idx" ON "activity_goal_freeze_period" USING btree ("user_id");
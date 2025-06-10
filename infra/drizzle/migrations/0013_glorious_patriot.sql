CREATE TABLE "activity_debt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"daily_target_quantity" numeric NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "activity_goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"target_month" text NOT NULL,
	"target_quantity" numeric NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "activity_debt" ADD CONSTRAINT "activity_debt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_debt" ADD CONSTRAINT "activity_debt_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_goal" ADD CONSTRAINT "activity_goal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_goal" ADD CONSTRAINT "activity_goal_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_debt_user_id_idx" ON "activity_debt" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_debt_activity_id_idx" ON "activity_debt" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "activity_goal_user_id_idx" ON "activity_goal" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_goal_activity_id_idx" ON "activity_goal" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "activity_goal_unique_idx" ON "activity_goal" USING btree ("user_id","activity_id","target_month");
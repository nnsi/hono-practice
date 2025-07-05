ALTER TABLE "activity_debt" RENAME TO "activity_goal";--> statement-breakpoint
ALTER TABLE "activity_goal" DROP CONSTRAINT "activity_debt_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_goal" DROP CONSTRAINT "activity_debt_activity_id_activity_id_fk";
--> statement-breakpoint
DROP INDEX "activity_debt_user_id_idx";--> statement-breakpoint
DROP INDEX "activity_debt_activity_id_idx";--> statement-breakpoint
ALTER TABLE "activity_goal" ADD CONSTRAINT "activity_goal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_goal" ADD CONSTRAINT "activity_goal_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_goal_user_id_idx" ON "activity_goal" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_goal_activity_id_idx" ON "activity_goal" USING btree ("activity_id");
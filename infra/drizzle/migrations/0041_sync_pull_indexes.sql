CREATE INDEX "activity_goal_freeze_period_user_id_updated_at_idx" ON "activity_goal_freeze_period" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "activity_goal_user_id_updated_at_idx" ON "activity_goal" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "activity_user_id_order_index_active_idx" ON "activity" USING btree ("user_id","order_index") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "activity_log_user_id_updated_at_idx" ON "activity_log" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "note_user_id_updated_at_idx" ON "note" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "task_user_id_updated_at_idx" ON "task" USING btree ("user_id","updated_at");

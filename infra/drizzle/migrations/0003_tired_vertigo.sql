CREATE TABLE "goals_activities" (
	"goal_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	CONSTRAINT "goals_activities_goal_id_activity_id_pk" PRIMARY KEY("goal_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "goals_tasks" (
	"goal_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	CONSTRAINT "goals_tasks_goal_id_task_id_pk" PRIMARY KEY("goal_id","task_id")
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN "done_hour" time;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "due" date;--> statement-breakpoint
ALTER TABLE "goals_activities" ADD CONSTRAINT "goals_activities_goal_id_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals_activities" ADD CONSTRAINT "goals_activities_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals_tasks" ADD CONSTRAINT "goals_tasks_goal_id_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals_tasks" ADD CONSTRAINT "goals_tasks_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_activities_goal_id_idx" ON "goals_activities" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goals_activities_activity_id_idx" ON "goals_activities" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "goals_tasks_goal_id_idx" ON "goals_tasks" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goals_tasks_task_id_idx" ON "goals_tasks" USING btree ("task_id");
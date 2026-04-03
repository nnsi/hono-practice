CREATE TABLE "subscription_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"plan" text NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"webhook_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_subscription_id_user_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscription"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_history_sub_id_created_idx" ON "subscription_history" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_history_webhook_id_uniq" ON "subscription_history" USING btree ("webhook_id") WHERE "subscription_history"."webhook_id" IS NOT NULL;
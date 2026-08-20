CREATE TABLE "admin_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_subscription" ADD COLUMN "last_event_occurred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD COLUMN "last_event_sequence" text;--> statement-breakpoint
ALTER TABLE "user_subscription" DROP CONSTRAINT "user_subscription_user_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "admin_session_token_hash_uniq" ON "admin_session" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_session_email_idx" ON "admin_session" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admin_session_expires_at_idx" ON "admin_session" USING btree ("expires_at");--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "user_provider"
		WHERE "deleted_at" IS NULL
		GROUP BY "provider", "provider_account_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'active OAuth identity duplicates must be resolved before migration 0042';
	END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX "user_provider_identity_unique" ON "user_provider" USING btree ("provider","provider_account_id") WHERE "user_provider"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "user_provider_user_id_idx" ON "user_provider" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_subscription_provider_identity_uniq" ON "user_subscription" USING btree ("payment_provider","payment_provider_id");

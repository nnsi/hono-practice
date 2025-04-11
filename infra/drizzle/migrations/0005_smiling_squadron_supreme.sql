CREATE TABLE "user_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_token_unique";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "selector" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_providers" ADD CONSTRAINT "user_providers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_token_selector_idx" ON "refresh_tokens" USING btree ("selector");--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_selector_unique" UNIQUE("selector");
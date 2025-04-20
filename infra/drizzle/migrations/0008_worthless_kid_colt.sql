ALTER TABLE "refresh_tokens" RENAME TO "refresh_token";--> statement-breakpoint
ALTER TABLE "user_providers" RENAME TO "user_provider";--> statement-breakpoint
ALTER TABLE "refresh_token" DROP CONSTRAINT "refresh_tokens_selector_unique";--> statement-breakpoint
ALTER TABLE "refresh_token" DROP CONSTRAINT "refresh_tokens_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_provider" DROP CONSTRAINT "user_providers_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_provider" ADD CONSTRAINT "user_provider_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_selector_unique" UNIQUE("selector");
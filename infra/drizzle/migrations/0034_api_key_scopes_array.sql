-- scope (text) → scopes (text[]) への移行
ALTER TABLE "api_key" ADD COLUMN "scopes" text[] NOT NULL DEFAULT ARRAY['all']::text[];
--> statement-breakpoint
UPDATE "api_key" SET "scopes" = ARRAY["scope"];
--> statement-breakpoint
ALTER TABLE "api_key" DROP COLUMN "scope";

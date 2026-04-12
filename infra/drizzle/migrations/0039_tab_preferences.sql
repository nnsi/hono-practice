ALTER TABLE "user"
ADD COLUMN "tab_preferences" jsonb DEFAULT '["home","daily","stats","goals","tasks"]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "user"
ADD COLUMN "tab_preferences_updated_at" timestamp with time zone DEFAULT now() NOT NULL;

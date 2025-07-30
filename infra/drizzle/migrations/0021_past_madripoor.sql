CREATE TYPE "public"."icon_type" AS ENUM('emoji', 'upload', 'generate');--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "icon_type" "icon_type" DEFAULT 'emoji' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "icon_url" text;--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "icon_thumbnail_url" text;
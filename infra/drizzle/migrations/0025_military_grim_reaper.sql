ALTER TABLE "activity" ADD COLUMN "recording_mode" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "recording_mode_config" text;--> statement-breakpoint
UPDATE "activity" SET "recording_mode" = 'timer'
WHERE "recording_mode" = 'manual'
  AND (
    LOWER("quantity_unit") LIKE '%時%'
    OR LOWER("quantity_unit") LIKE '%分%'
    OR LOWER("quantity_unit") LIKE '%秒%'
    OR LOWER("quantity_unit") LIKE '%hour%'
    OR LOWER("quantity_unit") LIKE '%min%'
    OR LOWER("quantity_unit") LIKE '%sec%'
    OR LOWER("quantity_unit") LIKE '%時間%'
  );
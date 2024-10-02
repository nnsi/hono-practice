-- AlterTable
ALTER TABLE "activity" ADD COLUMN     "emoji" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "label" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "activity_kind" ADD COLUMN     "order_index" TEXT NOT NULL DEFAULT '';

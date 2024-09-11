-- AlterTable
ALTER TABLE "activity_log" ADD COLUMN     "activity_kind_id" TEXT;

-- CreateTable
CREATE TABLE "activity_kind" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "activity_kind_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_kind_id_key" ON "activity_kind"("id");

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_activity_kind_id_fkey" FOREIGN KEY ("activity_kind_id") REFERENCES "activity_kind"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_kind" ADD CONSTRAINT "activity_kind_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

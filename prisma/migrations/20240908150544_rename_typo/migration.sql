/*
  Warnings:

  - You are about to drop the `acticity_quantity_options` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "acticity_quantity_options" DROP CONSTRAINT "acticity_quantity_options_activity_id_fkey";

-- DropTable
DROP TABLE "acticity_quantity_options";

-- CreateTable
CREATE TABLE "activity_quantity_options" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "activity_quantity_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_quantity_options_id_key" ON "activity_quantity_options"("id");

-- AddForeignKey
ALTER TABLE "activity_quantity_options" ADD CONSTRAINT "activity_quantity_options_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

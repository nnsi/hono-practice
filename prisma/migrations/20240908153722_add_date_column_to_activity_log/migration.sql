/*
  Warnings:

  - Added the required column `date` to the `activity_log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "activity_log" ADD COLUMN     "date" TIMESTAMPTZ(3) NOT NULL;

/*
  Warnings:

  - A unique constraint covering the columns `[login_id]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_login_id_key" ON "user"("login_id");

/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Video` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Video_slug_key" ON "Video"("slug");

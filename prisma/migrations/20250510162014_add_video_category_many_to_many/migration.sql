/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Video` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_categoryId_fkey";

-- DropIndex
DROP INDEX "Video_categoryId_idx";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "categoryId";

-- CreateTable
CREATE TABLE "CategoriesOnVideos" (
    "videoId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "CategoriesOnVideos_pkey" PRIMARY KEY ("videoId","categoryId")
);

-- AddForeignKey
ALTER TABLE "CategoriesOnVideos" ADD CONSTRAINT "CategoriesOnVideos_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriesOnVideos" ADD CONSTRAINT "CategoriesOnVideos_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

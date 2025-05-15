/*
  Warnings:

  - You are about to drop the column `vwTypes` on the `Video` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CategoriesOnVideos" DROP CONSTRAINT "CategoriesOnVideos_categoryId_fkey";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "vwTypes";

-- DropEnum
DROP TYPE "VWType";

-- CreateTable
CREATE TABLE "VWType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VWType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VWTypesOnVideos" (
    "videoId" INTEGER NOT NULL,
    "vwTypeId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "VWTypesOnVideos_pkey" PRIMARY KEY ("videoId","vwTypeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "VWType_name_key" ON "VWType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VWType_slug_key" ON "VWType"("slug");

-- AddForeignKey
ALTER TABLE "CategoriesOnVideos" ADD CONSTRAINT "CategoriesOnVideos_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VWTypesOnVideos" ADD CONSTRAINT "VWTypesOnVideos_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VWTypesOnVideos" ADD CONSTRAINT "VWTypesOnVideos_vwTypeId_fkey" FOREIGN KEY ("vwTypeId") REFERENCES "VWType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "CategoriesOnVideos" DROP CONSTRAINT "CategoriesOnVideos_videoId_fkey";

-- AddForeignKey
ALTER TABLE "CategoriesOnVideos" ADD CONSTRAINT "CategoriesOnVideos_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

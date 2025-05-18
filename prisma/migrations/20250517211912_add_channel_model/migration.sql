/*
  Warnings:

  - You are about to drop the column `channelTitle` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `channelUrl` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Video" DROP COLUMN "channelTitle",
DROP COLUMN "channelUrl",
ADD COLUMN     "channelId" INTEGER;

-- CreateTable
CREATE TABLE "Channel" (
    "id" SERIAL NOT NULL,
    "platformChannelId" TEXT NOT NULL,
    "platform" "VideoPlatform" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "customUrl" TEXT,
    "country" TEXT,
    "videoCount" INTEGER DEFAULT 0,
    "subscriberCount" INTEGER DEFAULT 0,
    "viewCount" BIGINT DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Channel_name_idx" ON "Channel"("name");

-- CreateIndex
CREATE INDEX "Channel_platformChannelId_idx" ON "Channel"("platformChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_platform_platformChannelId_key" ON "Channel"("platform", "platformChannelId");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

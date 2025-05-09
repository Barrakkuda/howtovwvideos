/*
  Warnings:

  - Made the column `videoId` on table `Video` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Video" ALTER COLUMN "videoId" SET NOT NULL;

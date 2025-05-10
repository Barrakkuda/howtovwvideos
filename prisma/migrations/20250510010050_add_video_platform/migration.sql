/*
  Warnings:

  - Added the required column `platform` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VideoPlatform" AS ENUM ('YOUTUBE', 'VIMEO');

-- DropIndex
DROP INDEX "Video_url_key";

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "platform" "VideoPlatform" NOT NULL,
ALTER COLUMN "url" DROP NOT NULL;

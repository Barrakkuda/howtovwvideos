-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "channelTitle" TEXT,
ADD COLUMN     "isHowToVWVideo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "sourceKeyword" TEXT;

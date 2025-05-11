-- CreateEnum
CREATE TYPE "VWType" AS ENUM ('BEETLE', 'GHIA', 'THING', 'BUS', 'OFF_ROAD', 'TYPE3', 'TYPE4', 'ALL');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "vwTypes" "VWType"[];

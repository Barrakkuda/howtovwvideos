-- DropForeignKey
ALTER TABLE "TagsOnVideos" DROP CONSTRAINT "TagsOnVideos_videoId_fkey";

-- RenameForeignKey
ALTER TABLE "TagsOnVideos" RENAME CONSTRAINT "fk_video_tags_tag" TO "TagsOnVideos_tagId_fkey";

-- RenameForeignKey
ALTER TABLE "TagsOnVideos" RENAME CONSTRAINT "fk_video_tags_video" TO "TagsOnVideos_videoId_fkey";

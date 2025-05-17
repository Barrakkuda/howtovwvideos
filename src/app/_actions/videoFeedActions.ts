"use server";

import { prisma } from "@/lib/db";
import { VideoStatus } from "@generated/prisma";
import type { VideoCarouselItemData } from "@/components/video/VideoCarousel";
// CategoryInfo will be implicitly part of VideoCarouselItemData if VideoCardProps is updated correctly

export async function getRecentPopularVideos(
  limit: number = 20, // Added limit parameter with default 20
): Promise<VideoCarouselItemData[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const videos = await prisma.video.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        status: VideoStatus.PUBLISHED,
        isHowToVWVideo: true,
        slug: { not: null },
      },
      orderBy: {
        popularityScore: "desc",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        thumbnailUrl: true,
        categories: {
          // Include categories
          select: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      take: limit, // Use the limit parameter
    });

    return videos.map((video) => ({
      ...video,
      slug: video.slug!, // Non-null assertion for slug
      // Map categories from the nested structure to the flat structure VideoCard expects
      categories: video.categories.map((catOnVideo) => ({
        id: catOnVideo.category.id,
        name: catOnVideo.category.name,
        slug: catOnVideo.category.slug!, // Assert slug is non-null for category if schema guarantees it
      })),
    }));
  } catch (error) {
    console.error("Error fetching recent popular videos:", error);
    return [];
  }
}

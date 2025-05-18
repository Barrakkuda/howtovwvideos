"use server";

import { prisma } from "@/lib/db";
import { VideoStatus } from "@generated/prisma";
import type { VideoCarouselItemData } from "@/components/video/VideoCarousel";

export async function getRecentPopularVideos(
  limit: number = 20,
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
      take: limit,
    });

    return videos.map((video) => ({
      ...video,
      slug: video.slug!,
      categories: video.categories.map((catOnVideo) => ({
        id: catOnVideo.category.id,
        name: catOnVideo.category.name,
        slug: catOnVideo.category.slug!,
      })),
    }));
  } catch (error) {
    console.error("Error fetching recent popular videos:", error);
    return [];
  }
}

export async function getRecentlyPublishedVideos(
  limit: number = 20,
): Promise<VideoCarouselItemData[]> {
  try {
    const videos = await prisma.video.findMany({
      where: {
        status: VideoStatus.PUBLISHED,
        isHowToVWVideo: true,
        slug: { not: null },
        publishedAt: { not: null },
      },
      orderBy: {
        publishedAt: "desc",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        thumbnailUrl: true,
        publishedAt: true,
        categories: {
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
      take: limit,
    });

    return videos.map((video) => ({
      ...video,
      slug: video.slug!,
      thumbnailUrl: video.thumbnailUrl ?? undefined,
      categories: video.categories.map((catOnVideo) => ({
        id: catOnVideo.category.id,
        name: catOnVideo.category.name,
        slug: catOnVideo.category.slug!,
      })),
    }));
  } catch (error) {
    console.error("Error fetching recently published videos:", error);
    return [];
  }
}

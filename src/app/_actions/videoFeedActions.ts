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

export async function getRecentlyPublishedVideos(
  limit: number = 20,
): Promise<VideoCarouselItemData[]> {
  // Unlike getRecentPopularVideos, we don't filter by createdAt for "recently published".
  // We will filter by the presence of publishedAt and sort by it.
  // We can still use a time window if desired, e.g., published in the last X days/months,
  // but for a simple "recently published", ordering by publishedAt desc should be sufficient.

  try {
    const videos = await prisma.video.findMany({
      where: {
        status: VideoStatus.PUBLISHED,
        isHowToVWVideo: true,
        slug: { not: null },
        publishedAt: { not: null }, // Ensure publishedAt is not null
      },
      orderBy: {
        publishedAt: "desc", // Order by publication date
      },
      select: {
        id: true,
        slug: true,
        title: true,
        thumbnailUrl: true,
        publishedAt: true, // Include publishedAt for ordering and potential display
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
      thumbnailUrl: video.thumbnailUrl ?? undefined, // Ensure thumbnailUrl is string or undefined
      // Map categories from the nested structure
      categories: video.categories.map((catOnVideo) => ({
        id: catOnVideo.category.id,
        name: catOnVideo.category.name,
        slug: catOnVideo.category.slug!,
      })),
      // publishedAt will be part of the spread, ensure it's compatible
      // VideoCarouselItemData might need publishedAt if we decide to display it on the card
    }));
  } catch (error) {
    console.error("Error fetching recently published videos:", error);
    return [];
  }
}

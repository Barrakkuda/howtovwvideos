"use server";

import { prisma } from "@/lib/db";
import { VideoStatus } from "@generated/prisma";

export interface NavigationTag {
  id: number;
  name: string;
  slug: string;
  videoCount: number;
}

export async function fetchNavigationTags(
  limit: number = 20,
): Promise<{ success: boolean; data?: NavigationTag[]; error?: string }> {
  try {
    const tagsWithCounts = await prisma.tag.findMany({
      where: {
        videos: {
          some: {
            video: {
              status: VideoStatus.PUBLISHED,
              isHowToVWVideo: true, // Assuming we only want tags from these videos
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            videos: {
              where: {
                video: {
                  status: VideoStatus.PUBLISHED,
                  isHowToVWVideo: true,
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          videos: {
            _count: "desc",
          },
        },
        {
          name: "asc",
        },
      ],
      take: limit,
    });

    // Transform data to match NavigationTag interface
    const navigationTags: NavigationTag[] = tagsWithCounts.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      videoCount: tag._count.videos,
    }));

    return { success: true, data: navigationTags };
  } catch (error) {
    console.error("Error fetching navigation tags:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

"use server";

import { prisma } from "@/lib/db";
import { VideoStatus } from "@generated/prisma";
import { ActionResponse } from "@/lib/types";

export interface ChannelForPublic {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  videoCount: number;
}

// Fetch a single channel by slug
export async function getChannelBySlug(
  slug: string,
): Promise<ActionResponse<ChannelForPublic>> {
  try {
    const channel = await prisma.channel.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            videos: {
              where: {
                status: VideoStatus.PUBLISHED,
                isHowToVWVideo: true,
              },
            },
          },
        },
      },
    });

    if (!channel) {
      return { success: false, message: "Channel not found." };
    }

    return {
      success: true,
      data: {
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        description: channel.description,
        createdAt: channel.createdAt,
        videoCount: channel._count.videos,
      },
    };
  } catch (error) {
    console.error(`Error fetching channel by slug ${slug}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: errorMessage };
  }
}

// Fetch all channels for navigation
export async function fetchNavigationChannels(
  limit: number = 20,
): Promise<ActionResponse<ChannelForPublic[]>> {
  try {
    const channelsWithCounts = await prisma.channel.findMany({
      where: {
        videos: {
          some: {
            status: VideoStatus.PUBLISHED,
            isHowToVWVideo: true,
          },
        },
      },
      include: {
        _count: {
          select: {
            videos: {
              where: {
                status: VideoStatus.PUBLISHED,
                isHowToVWVideo: true,
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

    const navigationChannels: ChannelForPublic[] = channelsWithCounts.map(
      (channel) => ({
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        description: channel.description,
        createdAt: channel.createdAt,
        videoCount: channel._count.videos,
      }),
    );

    return { success: true, data: navigationChannels };
  } catch (error) {
    console.error("Error fetching navigation channels:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      success: false,
      error: errorMessage,
      message: errorMessage,
    };
  }
}

"use server";

import { prisma } from "@/lib/db";
import {
  Video,
  Category,
  CategoriesOnVideos,
  VWType as VWTypeModel,
  VWTypesOnVideos,
  Tag,
  TagsOnVideos,
  Channel,
} from "@generated/prisma";

export interface VideoForTable extends Video {
  categories: (CategoriesOnVideos & {
    category: Category;
  })[];
  vwTypes: (VWTypesOnVideos & {
    vwType: VWTypeModel;
  })[];
  tags: (TagsOnVideos & {
    tag: Tag;
  })[];
  channel?: Channel | null;
}

interface FetchVideosResponse {
  success: boolean;
  data?: VideoForTable[];
  error?: string;
}

export async function fetchVideosForTable(): Promise<FetchVideosResponse> {
  try {
    const videos = await prisma.video.findMany({
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        vwTypes: {
          include: {
            vwType: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        channel: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, data: videos as VideoForTable[] };
  } catch (error) {
    console.error("Error fetching videos for table:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch videos",
    };
  }
}

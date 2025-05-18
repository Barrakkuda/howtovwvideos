"use server";

import { prisma } from "@/lib/db";
import {
  VideoStatus,
  Video,
  Category,
  CategoriesOnVideos,
  VWType as VWTypeModel,
  VWTypesOnVideos,
  Tag,
  TagsOnVideos,
  Channel,
} from "@generated/prisma";
import { cache } from "react";

export type PublicVideoDetails = Video & {
  categories: (CategoriesOnVideos & {
    category: Category;
  })[];
  vwTypes: (VWTypesOnVideos & {
    vwType: VWTypeModel;
  })[];
  tags: (TagsOnVideos & {
    tag: Tag;
  })[];
  channel: Channel | null;
};

export const getVideoBySlug = cache(
  async (slug: string): Promise<PublicVideoDetails | null> => {
    try {
      const video = await prisma.video.findUnique({
        where: {
          slug: slug,
          status: VideoStatus.PUBLISHED,
        },
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
      });

      if (!video) {
        return null;
      }

      return video as PublicVideoDetails;
    } catch (error) {
      console.error(`Error fetching video by slug ${slug}:`, error);
      return null;
    }
  },
);

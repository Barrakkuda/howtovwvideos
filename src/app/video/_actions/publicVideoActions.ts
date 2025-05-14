"use server";

import { prisma } from "@/lib/db";
import {
  VideoStatus,
  Video,
  Category,
  CategoriesOnVideos,
} from "@generated/prisma";
import { cache } from "react";

// Define a more detailed type for the video data we expect to fetch
export type PublicVideoDetails = Video & {
  categories: (CategoriesOnVideos & {
    category: Category;
  })[];
  // vwTypes and tags are already part of the Video model as VWType[] and string[]
};

// Wrap the function with cache
export const getVideoByPlatformId = cache(
  async (platformVideoId: string): Promise<PublicVideoDetails | null> => {
    // Optional: Add a console.log here to observe caching behavior during development
    // console.log(`[Cache Check] Fetching video for platform ID: ${platformVideoId}`);
    try {
      const video = await prisma.video.findUnique({
        where: {
          videoId: platformVideoId, // This is the YouTube ID / platform-specific ID
          status: VideoStatus.PUBLISHED, // Only fetch published videos
        },
        include: {
          categories: {
            include: {
              category: true, // Include the full category object
            },
          },
          // VWTypes and tags are directly on the video model
        },
      });

      if (!video) {
        return null;
      }

      // Ensure the fetched video conforms to PublicVideoDetails, especially the categories structure.
      // Prisma's include should handle this structure correctly.
      return video as PublicVideoDetails;
    } catch (error) {
      console.error(
        `Error fetching video by platform ID ${platformVideoId}:`,
        error,
      );
      // In a production app, you might want to log this error to a monitoring service
      return null; // Return null on error to be handled by the page (e.g., notFound())
    }
  },
);

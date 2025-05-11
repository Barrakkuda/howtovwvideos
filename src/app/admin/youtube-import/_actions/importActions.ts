"use server";

import { prisma } from "@/lib/db";
import { Prisma, VideoPlatform, VideoStatus } from "@generated/prisma";
import { revalidatePath } from "next/cache";

// Import service functions
import {
  searchYouTubeVideos as searchVideosService,
  getYouTubeTranscript as getTranscriptService,
  YouTubeVideoItem,
  YouTubeSearchResponse,
} from "@/lib/services/youtube/youtubeService";
import {
  analyzeTranscriptWithOpenAI as analyzeTranscriptService,
  OpenAIAnalysisResponse,
} from "@/lib/services/openai/openaiService";

// Re-export types needed by client components that use these actions
export type {
  YouTubeVideoItem,
  YouTubeSearchResponse,
} from "@/lib/services/youtube/youtubeService";
export type { OpenAIAnalysisResponse } from "@/lib/services/openai/openaiService";

export interface ImportVideoResponse {
  success: boolean;
  message: string;
  videoId?: string;
}

// Define the payload structure for the import action
export interface ImportYouTubeVideoPayload {
  videoData: YouTubeVideoItem;
  categoryId?: number; // For single, existing category selection
  categories?: string[]; // Changed from suggestedCategoryNames
  isHowToVWVideo: boolean;
  sourceKeyword: string;
  channelTitle?: string;
}

// Action to import a video into the database
export async function importYouTubeVideo(
  payload: ImportYouTubeVideoPayload,
): Promise<ImportVideoResponse> {
  const {
    videoData,
    categoryId,
    categories,
    isHowToVWVideo,
    sourceKeyword,
    channelTitle,
  } = payload;

  if (!videoData || !videoData.id) {
    return { success: false, message: "Invalid video data provided." };
  }

  // Validate that either categoryId or categories are provided IF it's a HowToVWVideo
  if (
    isHowToVWVideo &&
    !categoryId &&
    (!categories || categories.length === 0)
  ) {
    return {
      success: false,
      message: "No category information provided for a How-To VW video.",
    };
  }

  let transcriptText: string | null = null;
  try {
    const transcriptResponse = await getTranscriptService(videoData.id);
    if (transcriptResponse.success && transcriptResponse.transcript) {
      transcriptText = transcriptResponse.transcript;
    } else {
      console.log(
        `No transcript found or error for video ID: ${videoData.id}. Error: ${transcriptResponse.error}`,
      );
    }
  } catch (transcriptError) {
    console.warn(
      `Exception fetching transcript for ${videoData.id}:`,
      transcriptError,
    );
  }

  try {
    const existingVideo = await prisma.video.findUnique({
      where: { videoId: videoData.id },
    });

    if (existingVideo) {
      return {
        success: false,
        message: `Video "${videoData.title}" already exists.`,
        videoId: videoData.id,
      };
    }

    const categoryIdsToLink: number[] = [];

    const videoCreateData: Prisma.VideoCreateInput = {
      platform: VideoPlatform.YOUTUBE,
      videoId: videoData.id,
      title: videoData.title, // Always save title
      isHowToVWVideo: isHowToVWVideo,
      sourceKeyword: sourceKeyword,
      processedAt: new Date(),
      status: isHowToVWVideo ? VideoStatus.DRAFT : VideoStatus.REJECTED, // Set status based on isHowToVWVideo
      // Conditional fields based on isHowToVWVideo
      ...(isHowToVWVideo && {
        description: videoData.description || "",
        url: `https://www.youtube.com/watch?v=${videoData.id}`,
        thumbnailUrl: videoData.thumbnailUrl,
        channelTitle: channelTitle, // From payload
        transcript: transcriptText, // Fetched earlier in this function
      }),
    };

    if (isHowToVWVideo) {
      if (categoryId) {
        const catExists = await prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!catExists) {
          return {
            success: false,
            message: `Category with ID ${categoryId} not found.`,
          };
        }
        categoryIdsToLink.push(categoryId);
      } else if (categories && categories.length > 0) {
        for (const name of categories) {
          if (!name.trim()) continue;
          let category = await prisma.category.findFirst({
            where: { name: { equals: name.trim(), mode: "insensitive" } },
          });
          if (!category) {
            try {
              category = await prisma.category.create({
                data: { name: name.trim() },
              });
            } catch (createError: unknown) {
              if (
                createError instanceof Prisma.PrismaClientKnownRequestError &&
                createError.code === "P2002" &&
                (createError.meta?.target as string[])?.includes("name")
              ) {
                category = await prisma.category.findFirst({
                  where: { name: { equals: name.trim(), mode: "insensitive" } },
                });
                if (!category)
                  return {
                    success: false,
                    message: `Failed to find category "${name.trim()}" after race condition.`,
                  };
              } else {
                const errorMessage =
                  createError instanceof Error
                    ? createError.message
                    : "Unknown error during category creation";
                return {
                  success: false,
                  message: `Failed to create category "${name.trim()}". Error: ${errorMessage}`,
                };
              }
            }
          }
          if (category && !categoryIdsToLink.includes(category.id)) {
            categoryIdsToLink.push(category.id);
          }
        }
      }
      if (categoryIdsToLink.length > 0) {
        videoCreateData.categories = {
          create: categoryIdsToLink.map((catId) => ({
            category: { connect: { id: catId } },
            assignedBy: "youtube-import-form",
          })),
        };
      } else {
        // If it's a HowToVWVideo but no valid categories could be linked (e.g., OpenAI suggested none, user selected none)
        // This case might need specific handling based on business rules, for now, it won't link any.
        // The form validation should ideally prevent this if categories are mandatory for HowToVWVideo.
      }
    }

    const newVideo = await prisma.video.create({ data: videoCreateData });

    revalidatePath("/admin/videos");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `Video "${newVideo.title}" imported successfully with ${categoryIdsToLink.length} categor${categoryIdsToLink.length === 1 ? "y" : "ies"}!`,
      videoId: newVideo.videoId,
    };
  } catch (error) {
    console.error("Failed to import video to DB:", error);
    const errorMessage = error instanceof Error ? error.message : "DB error.";
    return { success: false, message: errorMessage, videoId: videoData.id };
  }
}

// --- Server Actions for Client (YouTubeImportForm.tsx) ---

// Wrapper for YouTube search service
export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 10,
): Promise<YouTubeSearchResponse> {
  const serviceResponse = await searchVideosService(query, maxResults);

  if (
    !serviceResponse.success ||
    !serviceResponse.data ||
    serviceResponse.data.length === 0
  ) {
    return serviceResponse; // Return original response if search failed or no videos found
  }

  // Filter out videos that already exist in the database
  const youtubeVideoIds = serviceResponse.data.map((video) => video.id);
  const existingVideos = await prisma.video.findMany({
    where: {
      videoId: { in: youtubeVideoIds },
    },
    select: {
      videoId: true, // Only select the videoId for checking existence
    },
  });

  const existingVideoIds = new Set(existingVideos.map((v) => v.videoId));
  const newVideos = serviceResponse.data.filter(
    (video) => !existingVideoIds.has(video.id),
  );

  if (newVideos.length === 0 && serviceResponse.data.length > 0) {
    // All videos found were already in the DB
    return {
      success: true, // Search itself was successful
      data: [], // Return empty array
      error:
        "All videos found in the search results already exist in the database.",
      // Consider if quotaExceeded should be handled or passed through. Assuming not for this specific case.
    };
  }

  return {
    ...serviceResponse,
    data: newVideos, // Return only the videos not already in the DB
  };
}

// Wrapper for getting transcript service (for UI display)
export async function getYouTubeTranscript( // Name kept same as what YouTubeImportForm expects
  videoId: string,
): Promise<{ success: boolean; transcript?: string; error?: string }> {
  return getTranscriptService(videoId);
}

// Wrapper for OpenAI analysis service (for UI display)
export async function analyzeTranscriptWithOpenAI(transcript: string): Promise<{
  // Name kept same as what YouTubeImportForm expects
  success: boolean;
  data?: OpenAIAnalysisResponse;
  error?: string;
}> {
  return analyzeTranscriptService(transcript);
}

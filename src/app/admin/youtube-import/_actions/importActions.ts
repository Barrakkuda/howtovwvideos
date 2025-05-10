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
}

// Action to import a video into the database
export async function importYouTubeVideo(
  payload: ImportYouTubeVideoPayload,
): Promise<ImportVideoResponse> {
  const { videoData, categoryId, categories } = payload;

  if (!videoData || !videoData.id) {
    return { success: false, message: "Invalid video data provided." };
  }

  // Validate that either categoryId or categories are provided
  if (!categoryId && (!categories || categories.length === 0)) {
    return { success: false, message: "No category information provided." };
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

    if (categoryId) {
      // Ensure the single categoryId exists (optional check, Prisma connect will fail if not)
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
        if (!name.trim()) continue; // Skip empty names

        let category = await prisma.category.findFirst({
          where: { name: { equals: name.trim(), mode: "insensitive" } },
        });

        if (!category) {
          try {
            category = await prisma.category.create({
              data: { name: name.trim() },
            });
            console.log(
              `Created new category: "${category.name}" with ID ${category.id}`,
            );
          } catch (createError: unknown) {
            // Handle potential unique constraint violation if another process created it in the meantime
            if (
              createError instanceof Prisma.PrismaClientKnownRequestError &&
              createError.code === "P2002" &&
              (createError.meta?.target as string[])?.includes("name")
            ) {
              console.warn(
                `Category "${name.trim()}" likely created by another process, fetching it.`,
              );
              category = await prisma.category.findFirst({
                where: { name: { equals: name.trim(), mode: "insensitive" } },
              });
              if (!category) {
                return {
                  success: false,
                  message: `Failed to create or find category "${name.trim()}" after race condition.`,
                };
              }
            } else {
              console.error(
                `Failed to create category "${name.trim()}":`,
                createError,
              );
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
          // Ensure no duplicates if names are similar casing
          categoryIdsToLink.push(category.id);
        }
      }
    }

    if (categoryIdsToLink.length === 0) {
      return {
        success: false,
        message: "No valid categories could be assigned to the video.",
      };
    }

    const videoCreateData: Prisma.VideoCreateInput = {
      platform: VideoPlatform.YOUTUBE,
      videoId: videoData.id,
      title: videoData.title,
      description: videoData.description || "",
      url: `https://www.youtube.com/watch?v=${videoData.id}`,
      thumbnailUrl: videoData.thumbnailUrl,
      transcript: transcriptText,
      status: VideoStatus.DRAFT,
      categories: {
        create: categoryIdsToLink.map((catId) => ({
          category: { connect: { id: catId } },
          assignedBy: "system-youtube-import",
        })),
      },
    };

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
  return searchVideosService(query, maxResults);
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

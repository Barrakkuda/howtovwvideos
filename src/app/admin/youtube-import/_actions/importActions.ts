"use server";

import { prisma } from "@/lib/db";
import { VideoPlatform, VideoStatus } from "@generated/prisma";
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

// Action to import a video into the database
export async function importYouTubeVideo(
  videoData: YouTubeVideoItem,
  categoryId: number,
): Promise<ImportVideoResponse> {
  if (!videoData || !videoData.id) {
    return { success: false, message: "Invalid video data provided." };
  }
  if (!categoryId) {
    return { success: false, message: "Category ID is required." };
  }

  let transcriptText: string | null = null;
  try {
    const transcriptResponse = await getTranscriptService(videoData.id); // Use service
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

    const newVideo = await prisma.video.create({
      data: {
        platform: VideoPlatform.YOUTUBE,
        videoId: videoData.id,
        title: videoData.title,
        description: videoData.description || "",
        url: `https://www.youtube.com/watch?v=${videoData.id}`,
        thumbnailUrl: videoData.thumbnailUrl,
        transcript: transcriptText,
        status: VideoStatus.DRAFT,
        categoryId: categoryId,
      },
    });

    revalidatePath("/admin/videos");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `Video "${newVideo.title}" imported successfully!`,
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

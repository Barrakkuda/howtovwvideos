import { prisma } from "@/lib/db";
import { VideoPlatform, VideoStatus } from "@generated/prisma";
import { revalidatePath } from "next/cache";
import {
  getYouTubeTranscript,
  searchYouTubeVideos,
} from "../youtube/youtubeService";
import { analyzeTranscriptWithOpenAI } from "../openai/openaiService";

export interface BatchImportResult {
  videoId: string;
  success: boolean;
  message: string;
  error?: string;
}

export interface BatchImportOptions {
  maxVideos?: number;
  categoryId: number;
  searchQuery: string;
}

export async function batchImportVideos(
  options: BatchImportOptions,
): Promise<BatchImportResult[]> {
  const { maxVideos = 100, categoryId, searchQuery } = options;
  const results: BatchImportResult[] = [];

  try {
    // Search for videos
    const searchResponse = await searchYouTubeVideos(searchQuery, maxVideos);
    if (!searchResponse.success || !searchResponse.data) {
      return [
        {
          videoId: "search",
          success: false,
          message: "Failed to search videos",
          error: searchResponse.error,
        },
      ];
    }

    // Process each video
    for (const video of searchResponse.data) {
      try {
        // Check if video already exists
        const existingVideo = await prisma.video.findUnique({
          where: { videoId: video.id },
        });

        if (existingVideo) {
          results.push({
            videoId: video.id,
            success: false,
            message: `Video "${video.title}" already exists in the database.`,
          });
          continue;
        }

        // Get transcript
        const transcriptResult = await getYouTubeTranscript(video.id);
        let transcriptText = null;
        let openAIAnalysis = null;

        if (transcriptResult.success && transcriptResult.transcript) {
          transcriptText = transcriptResult.transcript;

          // Analyze with OpenAI if we have a transcript
          const analysisResult =
            await analyzeTranscriptWithOpenAI(transcriptText);
          if (analysisResult.success && analysisResult.data) {
            openAIAnalysis = analysisResult.data;
          }
        }

        // Only import if it's a VW video or if we couldn't analyze it
        if (!openAIAnalysis || openAIAnalysis.isHowToVWVideo) {
          const newVideo = await prisma.video.create({
            data: {
              platform: VideoPlatform.YOUTUBE,
              videoId: video.id,
              title: video.title,
              description: video.description || "",
              url: `https://www.youtube.com/watch?v=${video.id}`,
              thumbnailUrl: video.thumbnailUrl,
              transcript: transcriptText,
              status: VideoStatus.DRAFT,
              categoryId: categoryId,
            },
          });

          results.push({
            videoId: video.id,
            success: true,
            message: `Video "${newVideo.title}" imported successfully!`,
          });
        } else {
          results.push({
            videoId: video.id,
            success: false,
            message: `Video "${video.title}" is not a VW how-to video.`,
          });
        }
      } catch (error) {
        results.push({
          videoId: video.id,
          success: false,
          message: "Failed to process video",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Revalidate paths
    revalidatePath("/admin/videos");
    revalidatePath("/admin/dashboard");

    return results;
  } catch (error) {
    return [
      {
        videoId: "batch",
        success: false,
        message: "Batch import failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    ];
  }
}

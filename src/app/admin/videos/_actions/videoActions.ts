"use server";

import { prisma } from "@/lib/db";
import { videoSchema, VideoFormData } from "@/lib/validators/video";
import { VideoStatus, VideoPlatform, Prisma, VWType } from "@generated/prisma";
import { revalidatePath } from "next/cache";
import {
  getYouTubeTranscript as getTranscriptService,
  getYouTubeVideoInfo,
} from "@/lib/services/youtube/youtubeService";
import { analyzeTranscriptWithOpenAI as analyzeTranscriptService } from "@/lib/services/openai/openaiService";

export async function addVideo(formData: VideoFormData) {
  const result = videoSchema.safeParse(formData);

  if (!result.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  const data = result.data;

  try {
    await prisma.video.create({
      data: {
        platform: data.platform as VideoPlatform,
        videoId: data.videoId as string,
        title: data.title as string,
        description: data.description as string | null,
        url: data.url as string | null,
        thumbnailUrl: data.thumbnailUrl as string | null,
        channelTitle: data.channelTitle as string | null,
        channelUrl: data.channelUrl as string | null,
        transcript: data.transcript,
        status: data.status as VideoStatus,
        tags: data.tags,
        vwTypes: data.vwTypes as VWType[] | undefined,
        categories: {
          create: data.categoryIds.map((catId) => ({
            category: { connect: { id: catId } },
            assignedBy: "user-form",
          })),
        },
      },
    });

    revalidatePath("/admin/videos");
    return {
      success: true,
      message: "Video added successfully!",
    };
  } catch (error) {
    console.error("Failed to create video:", error);
    let errorMessage = "Failed to create video due to an unexpected error.";
    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as {
        code: string;
        meta?: { target?: string[] };
      };
      if (prismaError.code === "P2002") {
        const target = prismaError.meta?.target;
        if (target && target.includes("videoId")) {
          errorMessage = "A video with this Video ID already exists.";
        }
        if (target && target.includes("url")) {
          errorMessage = "A video with this URL already exists.";
        }
      } else if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      message: errorMessage,
    };
  }
}

export async function deleteVideo(id: number) {
  try {
    await prisma.video.delete({
      where: { id },
    });
    revalidatePath("/admin/videos");
    return {
      success: true,
      message: "Video deleted successfully!",
    };
  } catch (error) {
    console.error("Failed to delete video:", error);
    // Check for specific Prisma error for record not found, if desired
    // e.g., if (error.code === 'P2025') { ... }
    return {
      success: false,
      message:
        "Failed to delete video. It might have already been deleted or an error occurred.",
    };
  }
}

export async function updateVideo(id: number, formData: VideoFormData) {
  const result = videoSchema.safeParse(formData);

  if (!result.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  const data = result.data;

  try {
    // Use a transaction to ensure atomicity of operations
    await prisma.$transaction(async (tx) => {
      // 1. Disconnect all existing categories for this video
      await tx.categoriesOnVideos.deleteMany({
        where: { videoId: id },
      });

      // 2. Prepare the video update data, excluding categories for now
      const videoUpdateData: Prisma.VideoUpdateInput = {
        platform: data.platform as VideoPlatform,
        videoId: data.videoId as string,
        title: data.title as string,
        description: data.description as string | null,
        url: data.url as string | null,
        thumbnailUrl: data.thumbnailUrl as string | null,
        channelTitle: data.channelTitle as string | null,
        channelUrl: data.channelUrl as string | null,
        transcript: data.transcript,
        status: data.status as VideoStatus,
        tags: data.tags,
        vwTypes: data.vwTypes as VWType[] | undefined,
        isHowToVWVideo:
          data.status === VideoStatus.PUBLISHED ? true : undefined,
      };

      // 3. If new categoryIds are provided, add them to the update data
      if (data.categoryIds && data.categoryIds.length > 0) {
        videoUpdateData.categories = {
          create: data.categoryIds.map((catId) => ({
            category: { connect: { id: catId } },
            assignedBy: "user-form-update", // Or a more specific identifier
          })),
        };
      }

      // 4. Update the video with new data and new category connections
      await tx.video.update({
        where: { id },
        data: videoUpdateData,
      });
    });

    revalidatePath("/admin/videos");
    revalidatePath(`/admin/videos/edit/${id}`); // Revalidate the edit page itself
    return {
      success: true,
      message: "Video updated successfully!",
    };
  } catch (error) {
    console.error(`Failed to update video with id ${id}:`, error);
    let errorMessage = "Failed to update video due to an unexpected error.";
    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as {
        code: string;
        meta?: { target?: string[] };
      };
      if (prismaError.code === "P2002") {
        // Unique constraint violation
        const target = prismaError.meta?.target;
        if (target && target.includes("videoId")) {
          errorMessage = "A video with this Video ID already exists.";
        }
        if (target && target.includes("url")) {
          errorMessage = "A video with this URL already exists.";
        }
      } else if (prismaError.code === "P2025") {
        // Record to update not found
        errorMessage = "Video not found. It may have been deleted.";
      } else if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      message: errorMessage,
    };
  }
}

export async function getVideoTranscript(videoId: string) {
  try {
    const transcriptResponse = await getTranscriptService(videoId);
    console.log(
      "getVideoTranscript - transcriptResponse from service:",
      transcriptResponse,
    );

    if (transcriptResponse.success && transcriptResponse.transcript) {
      console.log(
        "getVideoTranscript - returning transcript:",
        transcriptResponse.transcript,
      );
      return {
        success: true,
        message: "Transcript fetched successfully!",
        transcript: transcriptResponse.transcript,
      };
    } else {
      console.log(
        "getVideoTranscript - service failed or no transcript in response:",
        transcriptResponse?.error,
      );
      return {
        success: false,
        message:
          transcriptResponse.error || "Failed to fetch transcript from service",
      };
    }
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch transcript",
    };
  }
}

export async function analyzeVideoWithOpenAI(
  videoId: string,
  transcript: string,
) {
  try {
    if (
      !transcript ||
      typeof transcript !== "string" ||
      transcript.trim().length === 0
    ) {
      return {
        success: false,
        message: "Invalid or empty transcript provided for analysis.",
      };
    }

    // We need the video title for analysis context
    const videoData = await prisma.video.findUnique({
      where: { videoId },
      select: { title: true },
    });

    if (!videoData) {
      return {
        success: false,
        message: "Video not found, cannot get title for analysis context.",
      };
    }

    const categoriesFromDb = await prisma.category.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const existingCategoryNames = categoriesFromDb.map((cat) => cat.name);
    const availableVWTypeNames = Object.values(VWType);

    const analysisResponse = await analyzeTranscriptService(
      transcript,
      existingCategoryNames,
      availableVWTypeNames,
      videoData.title,
    );

    if (!analysisResponse.success || !analysisResponse.data) {
      return {
        success: false,
        message: analysisResponse.error || "Failed to analyze transcript",
      };
    }

    return {
      success: true,
      message:
        "Video analyzed successfully with OpenAI. Form fields will be updated with suggestions.",
      analysis: analysisResponse.data,
    };
  } catch (error) {
    console.error("Error analyzing video:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to analyze video",
    };
  }
}

export async function refetchVideoInfo(videoId: string) {
  try {
    const videoInfo = await getYouTubeVideoInfo(videoId);

    if (!videoInfo) {
      return {
        success: false,
        message: `Could not fetch video info for ID: ${videoId}`,
      };
    }

    if (!videoInfo.data) {
      return {
        success: false,
        message: "Video info fetched successfully, but data is missing.",
      };
    }

    return {
      success: true,
      message: "Video info refetched successfully!",
      data: {
        title: videoInfo.data.title,
        description: videoInfo.data.description,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: videoInfo.data.thumbnailUrl,
        channelTitle: videoInfo.data.channelTitle,
        channelUrl: videoInfo.data.channelUrl,
      },
    };
  } catch (error) {
    console.error("Error refetching video info:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to refetch video information",
    };
  }
}

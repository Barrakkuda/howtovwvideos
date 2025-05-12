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

// Helper function to map string to VWType enum value
function mapStringToVWType(typeString: string): VWType | undefined {
  const upperTypeString = typeString.toUpperCase();
  if (upperTypeString in VWType) {
    return VWType[upperTypeString as keyof typeof VWType];
  }
  console.warn(`Unknown VWType string from OpenAI: ${typeString}`);
  return undefined;
}

export async function getVideoTranscript(videoId: string) {
  try {
    const transcriptResponse = await getTranscriptService(videoId);
    if (transcriptResponse.success && transcriptResponse.transcript) {
      // Update the video with the transcript
      await prisma.video.update({
        where: { videoId },
        data: { transcript: transcriptResponse.transcript },
      });
      revalidatePath("/admin/videos");
      return {
        success: true,
        message: "Transcript fetched and saved successfully!",
        transcript: transcriptResponse.transcript,
      };
    } else {
      return {
        success: false,
        message: transcriptResponse.error || "Failed to fetch transcript",
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

export async function analyzeVideoWithOpenAI(videoId: string) {
  try {
    // Get the video and its transcript
    const video = await prisma.video.findUnique({
      where: { videoId },
      select: { transcript: true, title: true },
    });

    if (!video) {
      return {
        success: false,
        message: "Video not found",
      };
    }

    if (!video.transcript) {
      return {
        success: false,
        message:
          "No transcript available for analysis. Please fetch the transcript first.",
      };
    }

    // Get existing categories for reference
    const categoriesFromDb = await prisma.category.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const existingCategoryNames = categoriesFromDb.map((cat) => cat.name);
    const availableVWTypeNames = Object.values(VWType);

    // Analyze the transcript
    const analysisResponse = await analyzeTranscriptService(
      video.transcript,
      existingCategoryNames,
      availableVWTypeNames,
      video.title,
    );

    if (!analysisResponse.success || !analysisResponse.data) {
      return {
        success: false,
        message: analysisResponse.error || "Failed to analyze transcript",
      };
    }

    const { data: analysis } = analysisResponse;

    // Update the video with the analysis results
    const updateData: Prisma.VideoUpdateInput = {};

    // Update VW Types if available
    if (analysis.vwTypes && analysis.vwTypes.length > 0) {
      const mappedVwTypes = analysis.vwTypes
        .map(mapStringToVWType)
        .filter((type): type is VWType => type !== undefined);
      if (mappedVwTypes.length > 0) {
        updateData.vwTypes = mappedVwTypes;
      }
    }

    // Update tags if available
    if (analysis.tags && analysis.tags.length > 0) {
      updateData.tags = analysis.tags;
    }

    // Update categories if available
    if (analysis.categories && analysis.categories.length > 0) {
      // First, find or create categories
      const categoryIds: number[] = [];
      for (const name of analysis.categories) {
        if (!name.trim()) continue;
        let category = await prisma.category.findFirst({
          where: { name: { equals: name.trim(), mode: "insensitive" } },
        });
        if (!category) {
          category = await prisma.category.create({
            data: { name: name.trim() },
          });
        }
        if (category && !categoryIds.includes(category.id)) {
          categoryIds.push(category.id);
        }
      }

      // Then update the video's categories
      if (categoryIds.length > 0) {
        // First remove existing categories
        await prisma.categoriesOnVideos.deleteMany({
          where: { video: { videoId } },
        });
        // Then add new ones
        updateData.categories = {
          create: categoryIds.map((catId) => ({
            category: { connect: { id: catId } },
            assignedBy: "openai-analysis",
          })),
        };
      }
    }

    // Update the video with all the changes
    await prisma.video.update({
      where: { videoId },
      data: updateData,
    });

    revalidatePath("/admin/videos");
    return {
      success: true,
      message: "Video analyzed and updated successfully!",
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
    // Get the video to check its platform and current data
    const video = await prisma.video.findUnique({
      where: { videoId },
      select: {
        platform: true,
        title: true,
        status: true,
      },
    });

    if (!video) {
      return {
        success: false,
        message: "Video not found",
      };
    }

    if (video.platform !== VideoPlatform.YOUTUBE) {
      return {
        success: false,
        message: "Refetching video info is only supported for YouTube videos",
      };
    }

    // Fetch fresh data from YouTube
    const videoInfo = await getYouTubeVideoInfo(videoId);
    if (!videoInfo.success || !videoInfo.data) {
      return {
        success: false,
        message:
          videoInfo.error || "Failed to fetch video information from YouTube",
      };
    }

    const { data } = videoInfo;

    // Update the video with the fetched information
    const updateData: Prisma.VideoUpdateInput = {
      title: data.title,
      description: data.description || "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: data.thumbnailUrl,
      channelTitle: data.channelTitle,
      channelUrl: data.channelUrl,
    };

    await prisma.video.update({
      where: { videoId },
      data: updateData,
    });

    revalidatePath("/admin/videos");
    return {
      success: true,
      message: "Video information updated successfully",
      data: updateData,
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

"use server";

import { prisma } from "@/lib/db";
import { videoSchema, VideoFormData } from "@/lib/validators/video";
import { VideoStatus, VideoPlatform, Prisma } from "@generated/prisma";
import { revalidatePath } from "next/cache";
import {
  getYouTubeTranscript as getTranscriptService,
  getYouTubeVideoInfo,
} from "@/lib/services/youtube/youtubeService";
import { analyzeTranscriptWithOpenAI as analyzeTranscriptService } from "@/lib/services/openai/openaiService";
import slugify from "slugify";

// Define return types for bulk actions
export interface BulkActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  count?: number; // Generic count for deleted/updated items
}

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
        vwTypes:
          data.vwTypes && data.vwTypes.length > 0
            ? {
                create: data.vwTypes.map((slug) => ({
                  assignedBy: "user-form",
                  vwType: {
                    connect: { slug: slug },
                  },
                })),
              }
            : undefined,
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

      // 1.5. Disconnect all existing VWTypes for this video
      await tx.vWTypesOnVideos.deleteMany({
        where: { videoId: id },
      });

      // 2. Prepare the video update data, excluding categories and vwTypes for now
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

      // 3.5 If new vwTypes are provided, add them to the update data
      if (data.vwTypes && data.vwTypes.length > 0) {
        videoUpdateData.vwTypes = {
          create: data.vwTypes.map((slug) => ({
            assignedBy: "user-form-update",
            vwType: { connect: { slug: slug } },
          })),
        };
      }

      // 4. Update the video with new data and new category/vwType connections
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

    // Fetch VWType names from the database
    const vwTypesFromDb = await prisma.vWType.findMany({
      select: { name: true },
      orderBy: { name: "asc" }, // or sortOrder, then name if preferred
    });
    const availableVWTypeNames = vwTypesFromDb.map((type) => type.name);

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

// --- Bulk Actions Start ---

export async function bulkDeleteVideos(
  ids: number[],
): Promise<BulkActionResponse> {
  if (!ids || ids.length === 0) {
    return {
      success: false,
      error: "No video IDs provided for deletion.",
      count: 0,
    };
  }

  try {
    const result = await prisma.video.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    revalidatePath("/admin/videos");
    return {
      success: true,
      message: `${result.count} video(s) deleted successfully.`,
      count: result.count,
    };
  } catch (error) {
    console.error("Failed to bulk delete videos:", error);
    return {
      success: false,
      error: "An error occurred while deleting videos.",
      count: 0,
    };
  }
}

export async function bulkGenerateSlugsForVideos(
  ids: number[],
): Promise<BulkActionResponse> {
  if (!ids || ids.length === 0) {
    return {
      success: false,
      error: "No video IDs provided for slug generation.",
      count: 0,
    };
  }

  let updatedCount = 0;
  const errors: string[] = [];

  for (const id of ids) {
    let videoTitleForErrorReporting: string | null = null; // Variable to hold title for error reporting
    try {
      const video = await prisma.video.findUnique({
        where: { id },
        select: { title: true, slug: true },
      });
      videoTitleForErrorReporting = video?.title ?? null;

      if (!video) {
        errors.push(`Video with ID ${id} not found.`);
        continue;
      }

      if (!video.title) {
        errors.push(`Video with ID ${id} has no title, cannot generate slug.`);
        continue;
      }

      const newSlug = slugify(video.title, { lower: true, strict: true });

      await prisma.video.update({
        where: { id },
        data: { slug: newSlug },
      });
      updatedCount++;
    } catch (error: unknown) {
      console.error(`Failed to generate slug for video ID ${id}:`, error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = error.meta?.target;
        // Check if target is an array and includes 'slug', or if it's a string and equals 'slug'
        const isSlugConflict = Array.isArray(target)
          ? target.includes("slug")
          : target === "slug";
        if (isSlugConflict) {
          errors.push(
            `Error for video ID ${id}: A video with the generated slug from title "${videoTitleForErrorReporting || "[unknown title]"}" already exists.`,
          );
        } else {
          // Handle other P2002 errors if necessary, or use a general message
          errors.push(
            `Error for video ID ${id}: A unique constraint violation occurred (not necessarily on slug).`,
          );
        }
      } else if (error instanceof Error) {
        errors.push(
          `Error processing video ID ${id}: ${error.message || "Unknown error"}`,
        );
      } else {
        errors.push(`Error processing video ID ${id}: Unknown error object.`);
      }
    }
  }

  if (updatedCount > 0) {
    revalidatePath("/admin/videos");
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `Processed ${ids.length} videos. ${updatedCount} slugs generated/updated. Errors: ${errors.join("; ")}`,
      count: updatedCount,
    };
  }

  return {
    success: true,
    message: `${updatedCount} video slug(s) generated/updated successfully.`,
    count: updatedCount,
  };
}

// --- Bulk Actions End ---

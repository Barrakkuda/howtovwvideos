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
    // Process Tags: Upsert and collect IDs for addVideo
    const add_tagIdsToConnect: number[] = [];
    if (data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        if (!tagName || !tagName.trim()) continue;
        const normalizedTagName = tagName.trim();
        const tagSlug = slugify(normalizedTagName, {
          lower: true,
          strict: true,
        });
        try {
          const tag = await prisma.tag.upsert({
            where: { slug: tagSlug },
            create: { name: normalizedTagName, slug: tagSlug },
            update: {},
          });
          if (tag) {
            add_tagIdsToConnect.push(tag.id);
          }
        } catch (tagError) {
          console.error(
            `Error upserting tag "${normalizedTagName}" (slug: ${tagSlug}) for new video:`,
            tagError,
          );
        }
      }
    }

    await prisma.video.create({
      data: {
        platform: data.platform as VideoPlatform,
        videoId: data.videoId as string,
        title: data.title as string,
        description: data.description as string | null,
        url: data.url as string | null,
        thumbnailUrl: data.thumbnailUrl as string | null,
        transcript: data.transcript,
        status: data.status as VideoStatus,
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
        // NEW WAY for Tags in addVideo
        ...(add_tagIdsToConnect.length > 0 && {
          tags: {
            create: add_tagIdsToConnect.map((tagId) => ({
              tag: { connect: { id: tagId } },
              assignedBy: "user-form",
            })),
          },
        }),
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
    await prisma.$transaction(async (tx) => {
      await tx.categoriesOnVideos.deleteMany({ where: { videoId: id } });
      await tx.vWTypesOnVideos.deleteMany({ where: { videoId: id } });
      await tx.tagsOnVideos.deleteMany({ where: { videoId: id } }); // Disconnect old tags

      // Process new Tags for updateVideo: Upsert and collect IDs
      const update_tagIdsToConnect: number[] = [];
      if (data.tags && data.tags.length > 0) {
        for (const tagName of data.tags) {
          if (!tagName || !tagName.trim()) continue;
          const normalizedTagName = tagName.trim();
          const tagSlug = slugify(normalizedTagName, {
            lower: true,
            strict: true,
          });
          try {
            const tag = await tx.tag.upsert({
              where: { slug: tagSlug },
              create: { name: normalizedTagName, slug: tagSlug },
              update: {},
            });
            if (tag) {
              update_tagIdsToConnect.push(tag.id);
            }
          } catch (tagError) {
            console.error(
              `Error upserting tag "${normalizedTagName}" (slug: ${tagSlug}) for video update (ID: ${id}):`,
              tagError,
            );
          }
        }
      }

      const videoUpdateData: Prisma.VideoUpdateInput = {
        platform: data.platform as VideoPlatform,
        videoId: data.videoId as string,
        title: data.title as string,
        description: data.description as string | null,
        url: data.url as string | null,
        thumbnailUrl: data.thumbnailUrl as string | null,
        transcript: data.transcript,
        status: data.status as VideoStatus,
        isHowToVWVideo:
          data.status === VideoStatus.PUBLISHED ? true : undefined,
      };

      if (data.categoryIds && data.categoryIds.length > 0) {
        videoUpdateData.categories = {
          create: data.categoryIds.map((catId) => ({
            category: { connect: { id: catId } },
            assignedBy: "user-form-update",
          })),
        };
      }

      if (data.vwTypes && data.vwTypes.length > 0) {
        videoUpdateData.vwTypes = {
          create: data.vwTypes.map((slug) => ({
            assignedBy: "user-form-update",
            vwType: { connect: { slug: slug } },
          })),
        };
      }

      // NEW WAY for Tags in updateVideo
      if (update_tagIdsToConnect.length > 0) {
        videoUpdateData.tags = {
          create: update_tagIdsToConnect.map((tagId) => ({
            tag: { connect: { id: tagId } },
            assignedBy: "user-form-update",
          })),
        };
      }

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

export async function refetchVideoInfo(youtubeVideoId: string) {
  if (!youtubeVideoId) {
    return {
      success: false,
      message: "YouTube Video ID is required for refetching.",
    };
  }

  const existingVideo = await prisma.video.findFirst({
    where: { videoId: youtubeVideoId },
  });

  if (!existingVideo) {
    return {
      success: false,
      message: `Video with YouTube ID "${youtubeVideoId}" not found in database.`,
    };
  }

  try {
    const ytResponse = await getYouTubeVideoInfo(youtubeVideoId);

    if (!ytResponse.success || !ytResponse.data) {
      return {
        success: false,
        message:
          ytResponse.error || "Failed to fetch video info from YouTube API.",
      };
    }

    const videoData = ytResponse.data;
    let upsertedChannelId: number | undefined = undefined;

    // Upsert Channel information if available from YouTube response
    if (videoData.channel) {
      const channel = videoData.channel;
      const channelPublishedAtDate = channel.publishedAt
        ? new Date(channel.publishedAt)
        : null;

      try {
        const upserted = await prisma.channel.upsert({
          where: {
            platform_platformChannelId: {
              platform: channel.platform,
              platformChannelId: channel.platformId,
            },
          },
          create: {
            platform: channel.platform,
            platformChannelId: channel.platformId,
            name: channel.name,
            url: channel.url,
            description: channel.description,
            thumbnailUrl: channel.thumbnailUrl,
            customUrl: channel.customUrl,
            country: channel.country,
            videoCount: channel.videoCount ?? 0,
            subscriberCount: channel.subscriberCount ?? 0,
            viewCount: channel.viewCount
              ? BigInt(channel.viewCount)
              : BigInt(0),
            publishedAt:
              channelPublishedAtDate && !isNaN(channelPublishedAtDate.getTime())
                ? channelPublishedAtDate
                : null,
          },
          update: {
            name: channel.name,
            url: channel.url,
            description: channel.description,
            thumbnailUrl: channel.thumbnailUrl,
            customUrl: channel.customUrl,
            country: channel.country,
            videoCount: channel.videoCount ?? 0,
            subscriberCount: channel.subscriberCount ?? 0,
            viewCount: channel.viewCount
              ? BigInt(channel.viewCount)
              : BigInt(0),
            publishedAt:
              channelPublishedAtDate && !isNaN(channelPublishedAtDate.getTime())
                ? channelPublishedAtDate
                : null,
            updatedAt: new Date(),
          },
        });
        upsertedChannelId = upserted.id;
      } catch (channelError) {
        console.error("Error upserting channel during refetch:", channelError);
        // Non-critical for refetch, video data can still be updated.
      }
    }

    // Prepare video update data
    const videoUpdateData: Prisma.VideoUpdateInput = {
      title: videoData.title,
      description: videoData.description || existingVideo.description, // Keep existing if new is null/empty
      thumbnailUrl: videoData.thumbnailUrl || existingVideo.thumbnailUrl,
      url: `https://www.youtube.com/watch?v=${videoData.id}`,
      popularityScore:
        videoData.popularityScore !== undefined
          ? videoData.popularityScore
          : existingVideo.popularityScore,
      publishedAt:
        videoData.publishedAt &&
        !isNaN(new Date(videoData.publishedAt).getTime())
          ? new Date(videoData.publishedAt)
          : existingVideo.publishedAt, // Video's own publishedAt
      // channelTitle and channelUrl are removed from Video model
      processedAt: new Date(), // Mark as processed/refetched
    };

    if (upsertedChannelId) {
      videoUpdateData.channel = { connect: { id: upsertedChannelId } };
    }

    await prisma.video.update({
      where: { id: existingVideo.id },
      data: videoUpdateData,
    });

    revalidatePath("/admin/videos");
    revalidatePath(`/admin/videos/edit/${existingVideo.id}`);

    return {
      success: true,
      message: `Video "${videoData.title}" information refetched and updated successfully.`,
      data: {
        // Return some of the core updated fields for potential UI updates
        title: videoData.title,
        description: videoUpdateData.description,
        thumbnailUrl: videoUpdateData.thumbnailUrl,
      },
    };
  } catch (error) {
    console.error(`Error refetching video info for ${youtubeVideoId}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return {
      success: false,
      message: `Failed to refetch video info: ${errorMessage}`,
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

interface UpdateScoreResult {
  videoId: number; // internal DB ID
  youtubeVideoId?: string;
  success: boolean;
  newScore?: number | null;
  message: string;
}

export async function updatePopularityScores(
  internalVideoIds: number[],
): Promise<UpdateScoreResult[]> {
  const results: UpdateScoreResult[] = [];

  if (!internalVideoIds || internalVideoIds.length === 0) {
    return [
      {
        videoId: 0,
        success: false,
        message: "No video IDs provided.",
      },
    ];
  }

  for (const internalId of internalVideoIds) {
    let youtubeVideoIdForDisplay: string | undefined = undefined;
    try {
      const video = await prisma.video.findUnique({
        where: { id: internalId },
        select: { id: true, videoId: true }, // Only need youtube videoId from DB
      });

      if (!video) {
        results.push({
          videoId: internalId,
          success: false,
          message: "Video not found in database.",
        });
        continue;
      }

      if (!video.videoId) {
        results.push({
          videoId: internalId,
          success: false,
          message: "Video is missing YouTube Video ID.",
        });
        continue;
      }
      youtubeVideoIdForDisplay = video.videoId;

      const ytVideoInfo = await getYouTubeVideoInfo(video.videoId);

      if (ytVideoInfo.success && ytVideoInfo.data) {
        const newScore =
          ytVideoInfo.data.popularityScore === undefined
            ? null
            : ytVideoInfo.data.popularityScore;

        if (newScore !== null) {
          await prisma.video.update({
            where: { id: internalId },
            data: { popularityScore: newScore },
          });
          results.push({
            videoId: internalId,
            youtubeVideoId: youtubeVideoIdForDisplay,
            success: true,
            newScore: newScore,
            message: "Popularity score updated.",
          });
        } else {
          results.push({
            videoId: internalId,
            youtubeVideoId: youtubeVideoIdForDisplay,
            success: false,
            newScore: null,
            message:
              "New popularity score could not be determined from YouTube info (possibly null).",
          });
        }
      } else {
        results.push({
          videoId: internalId,
          youtubeVideoId: youtubeVideoIdForDisplay,
          success: false,
          message: `Failed to fetch YouTube info: ${ytVideoInfo.error || "Unknown YouTube API error"}`,
        });
      }
    } catch (error) {
      results.push({
        videoId: internalId,
        youtubeVideoId: youtubeVideoIdForDisplay,
        success: false,
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }

  if (results.some((r) => r.success)) {
    revalidatePath("/admin/videos");
    revalidatePath("/admin/dashboard");
  }

  return results;
}

export async function recalculateVideoPopularityScore(
  internalVideoId: number,
): Promise<{
  success: boolean;
  newScore?: number | null;
  message: string;
}> {
  try {
    const video = await prisma.video.findUnique({
      where: { id: internalVideoId },
      select: { videoId: true }, // Only need YouTube videoId
    });

    if (!video || !video.videoId) {
      return {
        success: false,
        message: "Video not found or missing YouTube video ID.",
      };
    }

    const ytVideoInfo = await getYouTubeVideoInfo(video.videoId);

    if (ytVideoInfo.success && ytVideoInfo.data) {
      const newScore =
        ytVideoInfo.data.popularityScore === undefined
          ? null
          : ytVideoInfo.data.popularityScore;

      await prisma.video.update({
        where: { id: internalVideoId },
        data: { popularityScore: newScore },
      });

      revalidatePath("/admin/videos");
      revalidatePath(`/admin/videos/edit/${internalVideoId}`);

      return {
        success: true,
        newScore,
        message: "Popularity score recalculated and updated successfully.",
      };
    } else {
      return {
        success: false,
        message: `Failed to fetch YouTube info: ${ytVideoInfo.error || "Unknown YouTube API error"}`,
      };
    }
  } catch (error) {
    console.error(
      `Error recalculating score for video ${internalVideoId}:`,
      error,
    );
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unknown error occurred during score recalculation.",
    };
  }
}

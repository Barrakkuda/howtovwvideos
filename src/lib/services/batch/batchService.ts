import { prisma } from "@/lib/db";
import { Prisma, VideoPlatform, VideoStatus, VWType } from "@generated/prisma";
import { revalidatePath } from "next/cache";
import {
  getYouTubeTranscript,
  searchYouTubeVideos,
} from "../youtube/youtubeService";
import { analyzeTranscriptWithOpenAI } from "../openai/openaiService";
import { OpenAIAnalysisResponse } from "../openai/openaiService";

// Helper function to map string to VWType enum value
function mapStringToVWType(typeString: string): VWType | undefined {
  const upperTypeString = typeString.toUpperCase();
  if (upperTypeString in VWType) {
    return VWType[upperTypeString as keyof typeof VWType];
  }
  console.warn(`Unknown VWType string from OpenAI (batch): ${typeString}`);
  return undefined;
}

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
  const {
    maxVideos = 100,
    /* categoryId (will be used as fallback or if OpenAI gives no categories) */ searchQuery,
  } = options;
  const results: BatchImportResult[] = [];

  try {
    // Fetch existing category names and VWType names once before the loop
    const categoriesFromDb = await prisma.category.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const existingCategoryNames = categoriesFromDb.map((cat) => cat.name);
    const availableVWTypeNames = Object.values(VWType);

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
        let openAIAnalysis: OpenAIAnalysisResponse | null = null;
        let isHowToVWVideoFromAnalysis = false;

        if (transcriptResult.success && transcriptResult.transcript) {
          transcriptText = transcriptResult.transcript;

          // Analyze with OpenAI if we have a transcript
          const analysisResult = await analyzeTranscriptWithOpenAI(
            transcriptText,
            existingCategoryNames,
            availableVWTypeNames,
          );
          if (analysisResult.success && analysisResult.data) {
            openAIAnalysis = analysisResult.data;
            isHowToVWVideoFromAnalysis = analysisResult.data.isHowToVWVideo;
          } else {
            console.warn(
              `OpenAI analysis failed for ${video.id}: ${analysisResult.error}`,
            );
          }
        } else {
          console.log(
            `No transcript for ${video.id}, cannot perform OpenAI analysis.`,
          );
        }

        const videoStatus = isHowToVWVideoFromAnalysis
          ? VideoStatus.DRAFT
          : VideoStatus.REJECTED;

        // Prepare data for video creation
        const videoCreateData: Prisma.VideoCreateInput = {
          platform: VideoPlatform.YOUTUBE,
          videoId: video.id,
          title: video.title,
          isHowToVWVideo: isHowToVWVideoFromAnalysis,
          sourceKeyword: searchQuery,
          processedAt: new Date(),
          status: videoStatus,
        };

        if (isHowToVWVideoFromAnalysis) {
          // Populate richer details only if it's a HowToVWVideo
          videoCreateData.description = video.description || "";
          videoCreateData.url = `https://www.youtube.com/watch?v=${video.id}`;
          videoCreateData.thumbnailUrl = video.thumbnailUrl;
          videoCreateData.channelTitle = video.channelTitle;
          videoCreateData.transcript = transcriptText;

          // Handle categories
          const categoryIdsToLink: number[] = [];
          let categoriesSource: string | undefined;

          if (
            openAIAnalysis?.categories &&
            openAIAnalysis.categories.length > 0
          ) {
            categoriesSource = "batch-import-openai";
            for (const name of openAIAnalysis.categories) {
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
                  // More robust check for PrismaClientKnownRequestError properties
                  if (
                    createError &&
                    typeof createError === "object" &&
                    "code" in createError &&
                    "meta" in createError
                    // && (createError as any).code === "P2002" //  More specific check if needed and 'as any' is acceptable temp solution
                  ) {
                    const prismaError = createError as {
                      code: string;
                      meta?: { target?: string[] };
                    }; // Type assertion
                    if (
                      prismaError.code === "P2002" &&
                      prismaError.meta?.target?.includes("name")
                    ) {
                      category = await prisma.category.findFirst({
                        where: {
                          name: { equals: name.trim(), mode: "insensitive" },
                        },
                      });
                      if (!category) {
                        console.error(
                          `Failed to find or create category "${name.trim()}" after race condition.`,
                        );
                        continue;
                      }
                    } else {
                      console.error(
                        `Failed to create category "${name.trim()}" due to Prisma error code: ${prismaError.code}`,
                      );
                      continue;
                    }
                  } else if (createError instanceof Error) {
                    console.error(
                      `Failed to create category "${name.trim()}" due to error: ${createError.message}`,
                    );
                    continue;
                  } else {
                    console.error(
                      `Failed to create category "${name.trim()}" due to unknown error:`,
                      createError,
                    );
                    continue;
                  }
                }
              }
              if (category && !categoryIdsToLink.includes(category.id)) {
                categoryIdsToLink.push(category.id);
              }
            }
          } else if (options.categoryId) {
            const catExists = await prisma.category.findUnique({
              where: { id: options.categoryId },
            });
            if (catExists) {
              categoryIdsToLink.push(options.categoryId);
              categoriesSource = "batch-import-manual-option";
            } else {
              console.warn(
                `Category ID ${options.categoryId} from batch options not found.`,
              );
            }
          }

          if (categoryIdsToLink.length > 0 && categoriesSource) {
            videoCreateData.categories = {
              create: categoryIdsToLink.map((catId) => ({
                category: { connect: { id: catId } },
                assignedBy: categoriesSource,
              })),
            };
          }

          // Handle vwTypes and tags from OpenAI analysis
          if (openAIAnalysis?.vwTypes && openAIAnalysis.vwTypes.length > 0) {
            const mappedVwTypes = openAIAnalysis.vwTypes
              .map(mapStringToVWType)
              .filter((type): type is VWType => type !== undefined);
            if (mappedVwTypes.length > 0) {
              videoCreateData.vwTypes = mappedVwTypes;
            }
          }

          if (openAIAnalysis?.tags && openAIAnalysis.tags.length > 0) {
            videoCreateData.tags = openAIAnalysis.tags;
          }
        }

        const newVideo = await prisma.video.create({ data: videoCreateData });

        const categoriesLinkedCount = Array.isArray(
          videoCreateData.categories?.create,
        )
          ? videoCreateData.categories.create.length
          : 0;

        results.push({
          videoId: video.id,
          success: true,
          message: `Video "${newVideo.title}" processed. Status: ${newVideo.status}. Categories linked: ${categoriesLinkedCount}.`,
        });
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

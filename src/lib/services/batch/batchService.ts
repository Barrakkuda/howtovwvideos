import { prisma } from "@/lib/db";
import { Prisma, VideoPlatform, VideoStatus } from "@generated/prisma";
import { revalidatePath } from "next/cache";
import {
  getYouTubeTranscript,
  searchYouTubeVideos,
} from "../youtube/youtubeService";
import { analyzeTranscriptWithOpenAI } from "../openai/openaiService";
import { OpenAIAnalysisResponse } from "../openai/openaiService";
import slugify from "slugify";

export interface BatchImportResult {
  videoId: string;
  success: boolean;
  message: string;
  error?: string;
}

export interface BatchImportOptions {
  maxResults?: number;
  searchQuery: string;
}

export async function batchImportVideos(
  options: BatchImportOptions,
): Promise<BatchImportResult[]> {
  const { maxResults = 10, searchQuery } = options;
  const results: BatchImportResult[] = [];
  let uncategorizedCategoryId: number | null = null;

  try {
    // Find or create the "Uncategorized" category once
    const uncategorizedCategoryName = "Uncategorized";
    let uncategorizedCat = await prisma.category.findUnique({
      where: { name: uncategorizedCategoryName },
    });
    if (!uncategorizedCat) {
      try {
        uncategorizedCat = await prisma.category.create({
          data: {
            name: uncategorizedCategoryName,
            description: "Videos that could not be automatically categorized.",
          },
        });
        console.log(
          `Created "${uncategorizedCategoryName}" category with ID: ${uncategorizedCat.id}`,
        );
      } catch (e) {
        // Handle potential race condition if another process creates it simultaneously
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          uncategorizedCat = await prisma.category.findUnique({
            where: { name: uncategorizedCategoryName },
          });
        } else {
          console.error(
            `Failed to create "${uncategorizedCategoryName}" category:`,
            e,
          );
        }
      }
    }
    if (uncategorizedCat) {
      uncategorizedCategoryId = uncategorizedCat.id;
    }

    // Fetch existing category names and VWType data (names and slugs) once before the loop
    const categoriesFromDb = await prisma.category.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const existingCategoryNames = categoriesFromDb.map((cat) => cat.name);

    const allDbVwTypes = await prisma.vWType.findMany({
      select: { name: true, slug: true },
    });
    const availableVWTypeNames = allDbVwTypes.map((vt) => vt.name); // For analyzeTranscriptWithOpenAI
    const validVwTypeSlugs = new Set(allDbVwTypes.map((vt) => vt.slug));
    const vwTypeNameToSlugMap = new Map(
      allDbVwTypes.map((vt) => [vt.name.toLowerCase(), vt.slug]),
    );

    // Search for videos
    const searchResponse = await searchYouTubeVideos(searchQuery, maxResults);
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
        let analysisError: string | null = null;

        if (transcriptResult.success && transcriptResult.transcript) {
          transcriptText = transcriptResult.transcript;

          const analysisResult = await analyzeTranscriptWithOpenAI(
            transcriptText,
            existingCategoryNames,
            availableVWTypeNames, // Pass fetched names
            video.title,
          );
          if (analysisResult.success && analysisResult.data) {
            openAIAnalysis = analysisResult.data;
            isHowToVWVideoFromAnalysis = analysisResult.data.isHowToVWVideo;
          } else {
            analysisError =
              analysisResult.error ||
              "OpenAI analysis failed for unknown reason.";
            console.warn(
              `OpenAI analysis failed for ${video.id}: ${analysisError}`,
            );
          }
        } else {
          analysisError =
            transcriptResult.error ||
            "Could not fetch transcript for analysis.";
          console.log(
            `No transcript for ${video.id}, cannot perform OpenAI analysis.`,
          );
        }

        const videoStatus = isHowToVWVideoFromAnalysis
          ? VideoStatus.PUBLISHED
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
          processingError: analysisError,
        };

        if (isHowToVWVideoFromAnalysis) {
          // Populate richer details only if it's a HowToVWVideo
          videoCreateData.description = video.description || "";
          videoCreateData.url = `https://www.youtube.com/watch?v=${video.id}`;
          videoCreateData.thumbnailUrl = video.thumbnailUrl;
          videoCreateData.channelTitle = video.channelTitle;
          videoCreateData.channelUrl = video.channelUrl;
          videoCreateData.slug = slugify(video.title, {
            lower: true,
            strict: true,
          });
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
                  // Check for PrismaClientKnownRequestError properties
                  if (
                    createError &&
                    typeof createError === "object" &&
                    "code" in createError &&
                    "meta" in createError
                  ) {
                    const prismaError = createError as {
                      code: string;
                      meta?: { target?: string[] };
                    };

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
          } else if (uncategorizedCategoryId) {
            // Fallback to Uncategorized
            categoryIdsToLink.push(uncategorizedCategoryId);
            categoriesSource = "batch-import-uncategorized-fallback";
            console.log(
              `Video ${video.id} (${video.title}) had no OpenAI categories, assigning to "Uncategorized".`,
            );
          }

          if (categoryIdsToLink.length > 0 && categoriesSource) {
            videoCreateData.categories = {
              create: categoryIdsToLink.map((catId) => ({
                category: { connect: { id: catId } },
                assignedBy: categoriesSource,
              })),
            };
          } else if (uncategorizedCategoryId) {
            // Link to "Uncategorized" if no categories were found by AI
            videoCreateData.categories = {
              create: [
                {
                  category: { connect: { id: uncategorizedCategoryId } },
                  assignedBy: "batch-import-system-uncategorized",
                },
              ],
            };
          }

          // Handle VWTypes (similar logic, ensure no erroneous fields are added)
          const vwTypeSlugsToLink: string[] = [];
          let vwTypesSource: string | undefined;

          if (openAIAnalysis?.vwTypes && openAIAnalysis.vwTypes.length > 0) {
            vwTypesSource = "batch-import-openai";
            for (const nameOrSlug of openAIAnalysis.vwTypes) {
              if (!nameOrSlug.trim()) continue;
              // OpenAI might return name or slug, try to match slug first, then name
              let slugToUse: string | undefined = undefined;
              if (validVwTypeSlugs.has(nameOrSlug.toLowerCase())) {
                slugToUse = nameOrSlug.toLowerCase();
              } else {
                slugToUse = vwTypeNameToSlugMap.get(nameOrSlug.toLowerCase());
              }

              if (slugToUse && !vwTypeSlugsToLink.includes(slugToUse)) {
                vwTypeSlugsToLink.push(slugToUse);
              }
            }
          }

          if (vwTypeSlugsToLink.length > 0 && vwTypesSource) {
            videoCreateData.vwTypes = {
              create: vwTypeSlugsToLink.map((slug) => ({
                vwType: { connect: { slug: slug } }, // Connect by slug
                assignedBy: vwTypesSource,
              })),
            };
          }

          // Handle Tags
          if (openAIAnalysis?.tags && openAIAnalysis.tags.length > 0) {
            videoCreateData.tags = openAIAnalysis.tags.filter(
              (tag) => tag && tag.trim() !== "",
            );
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

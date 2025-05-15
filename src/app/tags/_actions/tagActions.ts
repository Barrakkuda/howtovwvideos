"use server";

import { prisma } from "@/lib/db";
import { VideoStatus, Prisma } from "@generated/prisma";
import { revalidatePath } from "next/cache";
import { tagSchema, TagFormData } from "@/lib/validators/tag";
import { slugify } from "@/lib/utils/slugify";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  error?: string; // General error message
  count?: number; // For bulk actions
}

export interface TagForTable {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  videoCount: number;
  createdAt: Date;
}

export interface NavigationTag {
  id: number;
  name: string;
  slug: string;
  videoCount: number;
}

// Fetch a single tag by slug
export async function getTagBySlug(slug: string): Promise<
  ActionResponse<
    TagForTable & {
      videos: {
        videoId: string;
        videoTitle: string;
        videoSlug?: string | null;
      }[];
    }
  >
> {
  try {
    const tag = await prisma.tag.findUnique({
      where: { slug },
      include: {
        videos: {
          where: {
            video: {
              status: VideoStatus.PUBLISHED,
              isHowToVWVideo: true,
            },
          },
          select: {
            video: {
              select: {
                videoId: true, // youtube video id
                title: true,
                slug: true, // video page slug
              },
            },
          },
          orderBy: {
            video: {
              createdAt: "desc", // Or other relevant ordering for videos
            },
          },
        },
        _count: {
          select: {
            videos: {
              where: {
                video: {
                  status: VideoStatus.PUBLISHED,
                  isHowToVWVideo: true,
                },
              },
            },
          },
        },
      },
    });

    if (!tag) {
      return { success: false, message: "Tag not found." };
    }

    return {
      success: true,
      data: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        description: tag.description,
        createdAt: tag.createdAt,
        videoCount: tag._count.videos,
        videos: tag.videos.map((v) => ({
          videoId: v.video.videoId,
          videoTitle: v.video.title,
          videoSlug: v.video.slug,
        })),
      },
    };
  } catch (error) {
    console.error(`Error fetching tag by slug ${slug}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: errorMessage };
  }
}

export async function fetchTagsForTable(): Promise<
  ActionResponse<TagForTable[]>
> {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { videos: true },
        },
      },
    });

    const formattedTags: TagForTable[] = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      videoCount: tag._count.videos,
      createdAt: tag.createdAt,
    }));

    return { success: true, data: formattedTags };
  } catch (error) {
    console.error("Error fetching tags for table:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: errorMessage };
  }
}

export async function addTag(
  formData: TagFormData,
): Promise<ActionResponse<TagForTable>> {
  const validationResult = tagSchema.safeParse(formData);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { name, slug, description } = validationResult.data;
  const finalSlug = slug || slugify(name);

  try {
    const newTag = await prisma.tag.create({
      data: {
        name,
        slug: finalSlug,
        description,
      },
      include: {
        _count: { select: { videos: true } },
      },
    });
    revalidatePath("/admin/tags");
    revalidatePath("/video/tag"); // Revalidate public tag listing/pages if any
    return {
      success: true,
      message: "Tag added successfully!",
      data: { ...newTag, videoCount: newTag._count.videos },
    };
  } catch (error) {
    console.error("Failed to create tag:", error);
    let errorMessage = "Failed to create tag.";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes("name")) {
          errorMessage = "A tag with this name already exists.";
        } else if (target?.includes("slug")) {
          errorMessage = "A tag with this slug already exists.";
        }
      }
    }
    return { success: false, message: errorMessage };
  }
}

export async function updateTag(
  id: number,
  formData: TagFormData,
): Promise<ActionResponse<TagForTable>> {
  const validationResult = tagSchema.safeParse(formData);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { name, slug, description } = validationResult.data;
  // If slug is being updated, ensure it's valid or generate if empty and name changes.
  // However, typically slugs are not regenerated on every update unless explicitly requested.
  // The form should handle slug generation/suggestion logic.
  // For now, we trust the incoming slug or use existing if it's not part of formData.
  const tagToUpdate = await prisma.tag.findUnique({ where: { id } });
  if (!tagToUpdate) {
    return { success: false, message: "Tag not found." };
  }

  const finalSlug = slug || tagToUpdate.slug; // Keep existing slug if not provided

  try {
    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        slug: finalSlug,
        description,
      },
      include: {
        _count: { select: { videos: true } },
      },
    });
    revalidatePath("/admin/tags");
    revalidatePath(`/admin/tags/edit/${id}`); // Assuming an edit page exists
    revalidatePath(`/video/tag/${updatedTag.slug}`);
    revalidatePath(`/video/tag/${tagToUpdate.slug}`); // Revalidate old slug path if it changed

    return {
      success: true,
      message: "Tag updated successfully!",
      data: { ...updatedTag, videoCount: updatedTag._count.videos },
    };
  } catch (error) {
    console.error(`Failed to update tag with id ${id}:`, error);
    let errorMessage = "Failed to update tag.";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes("name")) {
          errorMessage = "Another tag with this name already exists.";
        } else if (target?.includes("slug")) {
          errorMessage = "Another tag with this slug already exists.";
        }
      } else if (error.code === "P2025") {
        errorMessage = "Tag not found for update.";
      }
    }
    return { success: false, message: errorMessage };
  }
}

export async function deleteTag(id: number): Promise<ActionResponse<never>> {
  try {
    const tagToDelete = await prisma.tag.findUnique({ where: { id } });
    if (!tagToDelete) {
      return { success: false, message: "Tag not found." };
    }

    await prisma.tag.delete({ where: { id } });
    revalidatePath("/admin/tags");
    revalidatePath("/video/tag");
    revalidatePath(`/video/tag/${tagToDelete.slug}`);
    return { success: true, message: "Tag deleted successfully!" };
  } catch (error) {
    console.error(`Failed to delete tag with id ${id}:`, error);
    // Add more specific error handling if needed (e.g., related records preventing deletion)
    return { success: false, message: "Failed to delete tag." };
  }
}

export async function bulkDeleteTags(
  ids: number[],
): Promise<ActionResponse<null>> {
  if (!ids || ids.length === 0) {
    return { success: false, message: "No tag IDs provided.", count: 0 };
  }
  try {
    const result = await prisma.tag.deleteMany({
      where: { id: { in: ids } },
    });
    revalidatePath("/admin/tags");
    revalidatePath("/video/tag"); // Broad revalidation
    return {
      success: true,
      message: `${result.count} tag(s) deleted successfully.`,
      count: result.count,
    };
  } catch (error) {
    console.error("Failed to bulk delete tags:", error);
    return {
      success: false,
      message: "An error occurred while deleting tags.",
      count: 0,
    };
  }
}

export async function bulkGenerateSlugsForTags(
  ids: number[],
): Promise<ActionResponse<null>> {
  if (!ids || ids.length === 0) {
    return {
      success: false,
      message: "No tag IDs provided for slug generation.",
      count: 0,
    };
  }

  let updatedCount = 0;
  const errors: string[] = [];

  for (const id of ids) {
    const tag = await prisma.tag.findUnique({
      where: { id },
      select: { name: true, slug: true },
    });

    if (!tag) {
      errors.push(`Tag with ID ${id} not found.`);
      continue;
    }

    const newSlug = slugify(tag.name);
    if (newSlug === tag.slug) {
      // errors.push(`Tag ID ${id} (${tag.name}) already has the correct slug: ${newSlug}. Skipping.`);
      // Optionally, count as updated or skip silently. For now, let's assume we only update if different.
      continue;
    }

    try {
      await prisma.tag.update({
        where: { id },
        data: { slug: newSlug },
      });
      updatedCount++;
      revalidatePath(`/video/tag/${tag.slug}`); // old slug
      revalidatePath(`/video/tag/${newSlug}`); // new slug
    } catch (error) {
      console.error(`Failed to update slug for tag ID ${id}:`, error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        errors.push(
          `Error for tag ID ${id}: A tag with the generated slug '${newSlug}' already exists.`,
        );
      } else {
        errors.push(
          `Error updating slug for tag ID ${id}: ${(error as Error).message || "Unknown error"}`,
        );
      }
    }
  }

  if (updatedCount > 0) {
    revalidatePath("/admin/tags");
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `Processed ${ids.length} tags. ${updatedCount} slugs generated/updated. Errors: ${errors.join("; ")}`,
      count: updatedCount,
      message: `Processed ${ids.length} tags. ${updatedCount} slugs generated/updated. Errors: ${errors.join("; ")}`,
    };
  }

  return {
    success: true,
    message: `${updatedCount} tag slug(s) generated/updated successfully.`,
    count: updatedCount,
  };
}

export async function fetchNavigationTags(
  limit: number = 20,
): Promise<ActionResponse<NavigationTag[]>> {
  try {
    const tagsWithCounts = await prisma.tag.findMany({
      where: {
        videos: {
          some: {
            video: {
              status: VideoStatus.PUBLISHED,
              isHowToVWVideo: true,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            videos: {
              where: {
                video: {
                  status: VideoStatus.PUBLISHED,
                  isHowToVWVideo: true,
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          videos: {
            _count: "desc",
          },
        },
        {
          name: "asc",
        },
      ],
      take: limit,
    });

    const navigationTags: NavigationTag[] = tagsWithCounts.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      videoCount: tag._count.videos,
    }));

    return { success: true, data: navigationTags };
  } catch (error) {
    console.error("Error fetching navigation tags:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      success: false,
      error: errorMessage, // Use general 'error' field for Promise<ActionResponse<T>>
      message: errorMessage, // Keep message for backward compatibility if used
    };
  }
}

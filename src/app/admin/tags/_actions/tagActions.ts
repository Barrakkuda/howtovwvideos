"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@generated/prisma";
import { revalidatePath } from "next/cache";
import { TagFormData, tagSchema } from "@/lib/validators/tag";
import { slugify } from "@/lib/utils/slugify"; // Assuming this will be created or exists

// Generic Action Response Type
export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  error?: string;
}

// Type for data returned to the DataTable
export interface TagForTable {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  videoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// For bulk action responses
export interface BulkActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  count?: number;
}

// --- CRUD Actions ---

export async function addTag(
  formData: TagFormData,
): Promise<ActionResponse<TagForTable>> {
  const validatedFields = tagSchema.safeParse({
    ...formData,
    slug: formData.slug || slugify(formData.name), // Generate slug if not provided
    description: formData.description || null,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, slug, description } = validatedFields.data;

  try {
    const existingTagBySlug = await prisma.tag.findUnique({
      where: { slug },
    });
    if (existingTagBySlug) {
      return {
        success: false,
        message: "A tag with this slug already exists.",
        errors: { slug: ["Slug is already in use."] },
      };
    }

    const existingTagByName = await prisma.tag.findUnique({
      where: { name },
    });
    if (existingTagByName) {
      return {
        success: false,
        message: "A tag with this name already exists.",
        errors: { name: ["Name is already in use."] },
      };
    }

    const newTag = await prisma.tag.create({
      data: {
        name,
        slug,
        description,
      },
    });

    revalidatePath("/admin/tags");
    // For TagForTable, we don't have videoCount immediately, so set to 0 or fetch if critical
    const tagForTable: TagForTable = {
      ...newTag,
      description: newTag.description ?? null,
      videoCount: 0,
    };

    return {
      success: true,
      message: "Tag added successfully!",
      data: tagForTable,
    };
  } catch (error) {
    console.error("Failed to add tag:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes("slug")) {
          return {
            success: false,
            message: "A tag with this slug already exists.",
            errors: { slug: ["Slug is already in use."] },
          };
        }
        if (target?.includes("name")) {
          return {
            success: false,
            message: "A tag with this name already exists.",
            errors: { name: ["Name is already in use."] },
          };
        }
      }
    }
    return {
      success: false,
      message: "Failed to add tag due to an unexpected error.",
      error:
        error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}

export async function updateTag(
  id: number,
  formData: TagFormData,
): Promise<ActionResponse<TagForTable>> {
  const validatedFields = tagSchema.safeParse({
    ...formData,
    slug: formData.slug || slugify(formData.name), // Generate slug if not provided or empty
    description: formData.description || null,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, slug, description } = validatedFields.data;

  try {
    const tagToUpdate = await prisma.tag.findUnique({ where: { id } });
    if (!tagToUpdate) {
      return { success: false, message: "Tag not found." };
    }

    // Check for slug conflicts if slug is being changed
    if (slug !== tagToUpdate.slug) {
      const existingTagBySlug = await prisma.tag.findUnique({
        where: { slug },
      });
      if (existingTagBySlug) {
        return {
          success: false,
          message: "A tag with this slug already exists.",
          errors: { slug: ["Slug is already in use."] },
        };
      }
    }

    // Check for name conflicts if name is being changed
    if (name !== tagToUpdate.name) {
      const existingTagByName = await prisma.tag.findUnique({
        where: { name },
      });
      if (existingTagByName) {
        return {
          success: false,
          message: "A tag with this name already exists.",
          errors: { name: ["Name is already in use."] },
        };
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        slug,
        description,
      },
      include: {
        _count: {
          select: { videos: true },
        },
      },
    });

    revalidatePath("/admin/tags");

    const tagForTable: TagForTable = {
      ...updatedTag,
      description: updatedTag.description ?? null,
      videoCount: updatedTag._count.videos,
    };

    return {
      success: true,
      message: "Tag updated successfully!",
      data: tagForTable,
    };
  } catch (error) {
    console.error(`Failed to update tag with id ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes("slug")) {
          return {
            success: false,
            message: "A tag with this slug already exists.",
            errors: { slug: ["Slug is already in use."] },
          };
        }
        if (target?.includes("name")) {
          return {
            success: false,
            message: "A tag with this name already exists.",
            errors: { name: ["Name is already in use."] },
          };
        }
      } else if (error.code === "P2025") {
        return { success: false, message: "Tag not found." };
      }
    }
    return {
      success: false,
      message: "Failed to update tag due to an unexpected error.",
      error:
        error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}

export async function deleteTag(id: number): Promise<ActionResponse<never>> {
  try {
    const tagToDelete = await prisma.tag.findUnique({ where: { id } });
    if (!tagToDelete) {
      return { success: false, message: "Tag not found." };
    }

    await prisma.tag.delete({
      where: { id },
    });

    revalidatePath("/admin/tags");

    return { success: true, message: "Tag deleted successfully." };
  } catch (error) {
    console.error(`Failed to delete tag with id ${id}:`, error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        success: false,
        message: "Tag not found, it may have already been deleted.",
      };
    }
    return {
      success: false,
      message: "Failed to delete tag.",
      error:
        error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}

// --- Fetch Actions ---

export async function fetchTagsForTable(): Promise<
  ActionResponse<TagForTable[]>
> {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { videos: true }, // Counts related TagsOnVideos entries
        },
      },
    });

    const tagsForTable: TagForTable[] = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description ?? null,
      videoCount: tag._count.videos,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));

    return { success: true, data: tagsForTable };
  } catch (error) {
    console.error("Failed to fetch tags for table:", error);
    return {
      success: false,
      message: "Failed to load tags.",
      error:
        error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}

export async function fetchNavigationTags(
  limit: number = 10,
): Promise<
  ActionResponse<
    Array<{ id: number; name: string; slug: string; videoCount: number }>
  >
> {
  try {
    const tags = await prisma.tag.findMany({
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            videos: {
              where: { video: { status: "PUBLISHED" } },
            },
          },
        },
      },
      orderBy: {
        videos: {
          _count: "desc",
        },
      },
    });

    const navigationTags = tags
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        videoCount: tag._count.videos,
      }))
      .filter((tag) => tag.videoCount > 0); // Ensure only tags with videos are shown

    return { success: true, data: navigationTags };
  } catch (error) {
    console.error("Failed to fetch navigation tags:", error);
    return {
      success: false,
      message: "Failed to load navigation tags.",
      error:
        error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}

// --- Bulk Actions ---

export async function bulkDeleteTags(
  ids: number[],
): Promise<BulkActionResponse> {
  if (!ids || ids.length === 0) {
    return { success: false, error: "No tag IDs provided.", count: 0 };
  }
  try {
    const result = await prisma.tag.deleteMany({
      where: {
        id: { in: ids },
      },
    });
    revalidatePath("/admin/tags");
    return {
      success: true,
      message: `${result.count} tag(s) deleted successfully.`,
      count: result.count,
    };
  } catch (error) {
    console.error("Failed to bulk delete tags:", error);
    return {
      success: false,
      error: "An error occurred while deleting tags.",
      count: 0,
    };
  }
}

export async function bulkGenerateSlugsForTags(
  ids: number[],
): Promise<BulkActionResponse> {
  if (!ids || ids.length === 0) {
    return {
      success: false,
      error: "No tag IDs provided for slug generation.",
      count: 0,
    };
  }

  let updatedCount = 0;
  const errors: string[] = [];

  for (const id of ids) {
    try {
      const tag = await prisma.tag.findUnique({
        where: { id },
        select: { name: true, slug: true }, // Select current slug
      });

      if (!tag) {
        errors.push(`Tag with ID ${id} not found.`);
        continue;
      }
      if (!tag.name) {
        errors.push(`Tag with ID ${id} has no name, cannot generate slug.`);
        continue;
      }

      const newSlug = slugify(tag.name);

      if (newSlug === tag.slug) {
        continue;
      }

      // Check if the new slug would conflict with another existing tag
      const existingTagWithNewSlug = await prisma.tag.findFirst({
        where: { slug: newSlug, NOT: { id: id } }, // Exclude the current tag itself
      });

      if (existingTagWithNewSlug) {
        errors.push(
          `Cannot generate slug for tag ID ${id} ('${tag.name}'). The new slug '${newSlug}' conflicts with existing tag '${existingTagWithNewSlug.name}' (ID: ${existingTagWithNewSlug.id}).`,
        );
        continue;
      }

      await prisma.tag.update({
        where: { id },
        data: { slug: newSlug },
      });
      updatedCount++;
    } catch (error) {
      console.error(`Failed to generate slug for tag ID ${id}:`, error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        errors.push(
          `Error for tag ID ${id}: A unique constraint violation occurred while trying to update slug. The generated slug might conflict with another tag.`,
        );
      } else {
        errors.push(
          `Error processing tag ID ${id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
  }

  if (updatedCount > 0) {
    revalidatePath("/admin/tags");
  }

  if (errors.length > 0) {
    const errorMessage = `Processed ${ids.length} tags. ${updatedCount} slugs generated/updated. Errors: ${errors.join("; ")}`;
    return {
      success: updatedCount > 0 && errors.length < ids.length,
      message:
        updatedCount > 0
          ? `${updatedCount} slug(s) generated. Some errors occurred.`
          : undefined,
      error: errorMessage,
      count: updatedCount,
    };
  }

  return {
    success: true,
    message: `${updatedCount} tag slug(s) generated/updated successfully.`,
    count: updatedCount,
  };
}

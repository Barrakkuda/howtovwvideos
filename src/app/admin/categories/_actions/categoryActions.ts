"use server";

import { prisma } from "@/lib/db";
import { categorySchema, CategoryFormData } from "@/lib/validators/category";
import { Prisma, Category } from "@generated/prisma";
import { revalidatePath } from "next/cache";
import slugify from "slugify";

// Define return types for bulk actions (can be shared with videoActions if moved to a common types file)
export interface BulkActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  count?: number;
}

export async function addCategory(formData: CategoryFormData) {
  const result = categorySchema.safeParse(formData);

  if (!result.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name, description } = result.data;

  try {
    const newCategory = await prisma.category.create({
      data: {
        name,
        description: description || null,
      },
    });

    revalidatePath("/admin/categories");
    return {
      success: true,
      data: newCategory,
      message: "Category added successfully!",
    };
  } catch (error) {
    console.error("Error adding category:", error);
    let errorMessage =
      error instanceof Error ? error.message : "Failed to add category.";
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta?.target.includes("name")
    ) {
      errorMessage = "A category with this name already exists.";
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function updateCategory(id: number, formData: CategoryFormData) {
  const result = categorySchema.safeParse(formData);

  if (!result.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name, description } = result.data;

  try {
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        description: description || null,
      },
    });

    revalidatePath("/admin/categories");
    revalidatePath(`/category/${updatedCategory.slug}`);
    return {
      success: true,
      data: updatedCategory,
      message: "Category updated successfully!",
    };
  } catch (error) {
    console.error(`Error updating category ${id}:`, error);
    let errorMessage =
      error instanceof Error ? error.message : "Failed to update category.";
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta?.target.includes("name")
    ) {
      errorMessage = "A category with this name already exists.";
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function deleteCategory(id: number) {
  try {
    await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/category");
    return {
      success: true,
      message: "Category deleted successfully!",
    };
  } catch (error) {
    console.error(`Error deleting category ${id}:`, error);
    let errorMessage = "Failed to delete category.";
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      errorMessage = "Category not found. It may have already been deleted.";
    } else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      errorMessage =
        "Cannot delete category. It is still associated with one or more videos. Please remove these associations first.";
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function fetchAllCategories(): Promise<{
  success: boolean;
  data?: Category[];
  error?: string;
}> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: { videos: true },
        },
      },
    });
    return { success: true, data: categories };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch categories.",
    };
  }
}

// --- Bulk Actions Start ---

export async function bulkDeleteCategories(
  ids: number[],
): Promise<BulkActionResponse> {
  if (!ids || ids.length === 0) {
    return {
      success: false,
      error: "No category IDs provided for deletion.",
      count: 0,
    };
  }

  try {
    const result = await prisma.category.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/category");
    return {
      success: true,
      message: `${result.count} categor(y/ies) deleted successfully.`,
      count: result.count,
    };
  } catch (error: unknown) {
    console.error("Failed to bulk delete categories:", error);
    // Check for P2003: Foreign key constraint failed (category is in use)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        error:
          "One or more categories could not be deleted because they are still associated with videos. Please remove these associations first.",
        count: 0,
      };
    }
    return {
      success: false,
      error: "An error occurred while deleting categories.",
      count: 0,
    };
  }
}

export async function bulkGenerateSlugsForCategories(
  ids: number[],
): Promise<BulkActionResponse> {
  if (!ids || ids.length === 0) {
    return {
      success: false,
      error: "No category IDs provided for slug generation.",
      count: 0,
    };
  }

  let updatedCount = 0;
  const errors: string[] = [];

  for (const id of ids) {
    let categoryNameForErrorReporting: string | null = null;
    try {
      const category = await prisma.category.findUnique({
        where: { id },
        select: { name: true, slug: true },
      });
      categoryNameForErrorReporting = category?.name ?? null;

      if (!category) {
        errors.push(`Category with ID ${id} not found.`);
        continue;
      }

      if (!category.name) {
        errors.push(
          `Category with ID ${id} has no name, cannot generate slug.`,
        );
        continue;
      }

      const newSlug = slugify(category.name, { lower: true, strict: true });

      await prisma.category.update({
        where: { id },
        data: { slug: newSlug },
      });
      updatedCount++;
    } catch (error: unknown) {
      console.error(`Failed to generate slug for category ID ${id}:`, error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = error.meta?.target;
        const isSlugConflict = Array.isArray(target)
          ? target.includes("slug")
          : target === "slug";
        if (isSlugConflict) {
          errors.push(
            `Error for category ID ${id}: A category with the generated slug from name "${categoryNameForErrorReporting || "[unknown name]"}" already exists.`,
          );
        } else {
          errors.push(
            `Error for category ID ${id}: A unique constraint violation occurred (not necessarily on slug).`,
          );
        }
      } else if (error instanceof Error) {
        errors.push(
          `Error processing category ID ${id}: ${error.message || "Unknown error"}`,
        );
      } else {
        errors.push(
          `Error processing category ID ${id}: Unknown error object.`,
        );
      }
    }
  }

  if (updatedCount > 0) {
    revalidatePath("/admin/categories");
    revalidatePath("/category");
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `Processed ${ids.length} categories. ${updatedCount} slugs generated/updated. Errors: ${errors.join("; ")}`,
      count: updatedCount,
    };
  }

  return {
    success: true,
    message: `${updatedCount} category slug(s) generated/updated successfully.`,
    count: updatedCount,
  };
}

// --- Bulk Actions End ---

// --- Public Fetching Start ---

export interface PublicCategory {
  id: number;
  name: string;
  slug: string | null; // Slug can be null
}

export async function fetchPublicCategories(): Promise<{
  success: boolean;
  data?: PublicCategory[];
  error?: string;
}> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      where: {
        slug: {
          not: "uncategorized",
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
    return { success: true, data: categories };
  } catch (error) {
    console.error("Error fetching public categories:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch public categories.",
    };
  }
}

// --- Public Fetching End ---

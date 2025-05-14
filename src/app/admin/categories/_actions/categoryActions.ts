"use server";

import { prisma } from "@/lib/db";
import { categorySchema, CategoryFormData } from "@/lib/validators/category";
import { Prisma, Category } from "@generated/prisma";
import { revalidatePath } from "next/cache";

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

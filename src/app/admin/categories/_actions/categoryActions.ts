"use server";

import { prisma } from "@/lib/db";
import { categorySchema, CategoryFormData } from "@/lib/validators/category";
import { Prisma } from "@generated/prisma";
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
    await prisma.category.create({
      data: {
        name,
        description: description || null, // Ensure optional field is handled
      },
    });

    revalidatePath("/admin/categories");
    return {
      success: true,
      message: "Category added successfully!",
    };
  } catch (error) {
    let errorMessage = "Failed to create category.";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Updated to check target as an array for Prisma 5+
      if (
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta?.target.includes("name")
      ) {
        errorMessage = "A category with this name already exists.";
        return {
          success: false,
          message: errorMessage,
          errors: { name: [errorMessage] },
        };
      }
    }
    console.error("Failed to create category:", error);
    return {
      success: false,
      message: errorMessage,
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
    await prisma.category.update({
      where: { id },
      data: {
        name,
        description: description || null,
      },
    });

    revalidatePath("/admin/categories");
    return {
      success: true,
      message: "Category updated successfully!",
    };
  } catch (error) {
    let errorMessage = "Failed to update category.";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta?.target.includes("name")
      ) {
        errorMessage = "A category with this name already exists.";
        return {
          success: false,
          message: errorMessage,
          errors: { name: [errorMessage] },
        };
      } else if (error.code === "P2025") {
        errorMessage = "Category not found. It may have been deleted.";
      }
    }
    console.error(`Failed to update category with id ${id}:`, error);
    return {
      success: false,
      message: errorMessage,
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

    console.error(`Failed to delete category with id ${id}:`, error);
    return {
      success: false,
      message: errorMessage,
    };
  }
}

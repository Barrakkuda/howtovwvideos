"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@generated/prisma";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import {
  VWTypeFormData,
  vwTypeSchema,
  vwTypeUpdateSchema,
} from "@/lib/validators/vwtype";

// Types
export interface VWTypeForTable {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  sortOrder: number;
  videoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NavigationVWType {
  id: number;
  name: string;
  slug: string;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string | null;
  errors?: Record<string, string[]> | null;
  count?: number;
}

// Fetch all VWTypes for the admin table
export async function fetchVWTypesForTable(): Promise<
  ActionResponse<VWTypeForTable[]>
> {
  try {
    const vwTypes = await prisma.vWType.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { videos: true },
        },
      },
    });

    const formattedVWTypes = vwTypes.map((vt) => ({
      ...vt,
      videoCount: vt._count.videos,
    }));

    return {
      success: true,
      message: "VW Types fetched successfully.",
      data: formattedVWTypes,
    };
  } catch (error) {
    console.error("Error fetching VW Types for table:", error);
    return {
      success: false,
      message: "Failed to fetch VW Types.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Fetch a single VWType by ID
export async function fetchVWTypeById(
  id: number,
): Promise<ActionResponse<VWTypeForTable>> {
  if (isNaN(id) || id <= 0) {
    return { success: false, message: "Invalid VWType ID provided." };
  }
  try {
    const vwType = await prisma.vWType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { videos: true },
        },
      },
    });

    if (!vwType) {
      return { success: false, message: "VWType not found." };
    }
    return {
      success: true,
      message: "VWType fetched successfully.",
      data: { ...vwType, videoCount: vwType._count.videos },
    };
  } catch (error) {
    console.error(`Error fetching VWType with ID ${id}:`, error);
    return {
      success: false,
      message: `Failed to fetch VWType with ID ${id}.`,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Add a new VWType
export async function addVWType(
  formData: VWTypeFormData,
): Promise<ActionResponse<VWTypeForTable>> {
  const validationResult = vwTypeSchema.safeParse(formData);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { name, description, sortOrder } = validationResult.data;
  let slug = validationResult.data.slug;

  if (!slug || slug.trim() === "") {
    slug = slugify(name, { lower: true, strict: true });
  }

  try {
    const newVWType = await prisma.vWType.create({
      data: {
        name,
        slug,
        description,
        sortOrder,
      },
      include: {
        _count: { select: { videos: true } },
      },
    });
    revalidatePath("/admin/vwtypes");
    revalidatePath("/admin/videos");
    revalidatePath("/");
    revalidatePath("/type");
    revalidatePath(`/type/${newVWType.slug}`);
    return {
      success: true,
      message: `VWType "${newVWType.name}" added successfully.`,
      data: { ...newVWType, videoCount: newVWType._count.videos },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        (error.meta?.target as string[])?.includes("slug")
      ) {
        return {
          success: false,
          message: "Slug already exists. Please choose a unique slug.",
        };
      }
      if (
        error.code === "P2002" &&
        (error.meta?.target as string[])?.includes("name")
      ) {
        return {
          success: false,
          message: "Name already exists. Please choose a unique name.",
        };
      }
    }
    console.error("Error adding VWType:", error);
    return {
      success: false,
      message: "Failed to add VWType.",
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

// Update an existing VWType
export async function updateVWType(
  id: number,
  formData: Partial<VWTypeFormData>,
): Promise<ActionResponse<VWTypeForTable>> {
  if (isNaN(id) || id <= 0) {
    return { success: false, message: "Invalid VWType ID for update." };
  }

  const validationResult = vwTypeUpdateSchema
    .partial()
    .safeParse({ ...formData, id });
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid data for update.",
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const dataToUpdate: Prisma.VWTypeUpdateInput = {};
  const parsedData = validationResult.data;

  if (parsedData.name !== undefined) dataToUpdate.name = parsedData.name;
  if (parsedData.description !== undefined)
    dataToUpdate.description = parsedData.description;
  if (parsedData.sortOrder !== undefined)
    dataToUpdate.sortOrder = parsedData.sortOrder;

  // Handle slug: update if name changes and slug is not explicitly provided or empty
  // Or if slug is explicitly provided
  if (parsedData.slug !== undefined && parsedData.slug.trim() !== "") {
    dataToUpdate.slug = slugify(parsedData.slug, { lower: true, strict: true });
  } else if (
    parsedData.name &&
    (parsedData.slug === undefined || parsedData.slug.trim() === "")
  ) {
    // If name changes and slug is not set or is empty, regenerate slug from name
    const currentVwType = await prisma.vWType.findUnique({
      where: { id },
      select: { name: true },
    });
    if (currentVwType && currentVwType.name !== parsedData.name) {
      dataToUpdate.slug = slugify(parsedData.name, {
        lower: true,
        strict: true,
      });
    }
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return { success: true, message: "No changes detected to update." };
  }

  try {
    const vwTypeBeforeUpdate = await prisma.vWType.findUnique({
      where: { id },
      select: { slug: true },
    });
    const originalSlug = vwTypeBeforeUpdate?.slug;

    const updatedVWType = await prisma.vWType.update({
      where: { id },
      data: dataToUpdate,
      include: {
        _count: { select: { videos: true } },
      },
    });
    revalidatePath("/admin/vwtypes");
    revalidatePath("/admin/videos");
    revalidatePath("/");
    revalidatePath("/type");
    if (originalSlug && originalSlug !== updatedVWType.slug) {
      revalidatePath(`/type/${originalSlug}`);
    }
    revalidatePath(`/type/${updatedVWType.slug}`);
    return {
      success: true,
      message: `VWType "${updatedVWType.name}" updated successfully.`,
      data: { ...updatedVWType, videoCount: updatedVWType._count.videos },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        (error.meta?.target as string[])?.includes("slug")
      ) {
        return {
          success: false,
          message: "Slug already exists. Please choose a unique slug.",
        };
      }
      if (
        error.code === "P2002" &&
        (error.meta?.target as string[])?.includes("name")
      ) {
        return {
          success: false,
          message: "Name already exists. Please choose a unique name.",
        };
      }
    }
    console.error(`Error updating VWType with ID ${id}:`, error);
    return {
      success: false,
      message: `Failed to update VWType with ID ${id}.`,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

// Delete a VWType
export async function deleteVWType(id: number): Promise<ActionResponse> {
  if (isNaN(id) || id <= 0) {
    return { success: false, message: "Invalid VWType ID for deletion." };
  }
  try {
    const vwTypeToDelete = await prisma.vWType.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!vwTypeToDelete) {
      return { success: false, message: "VWType not found for deletion." };
    }

    await prisma.vWType.delete({ where: { id } });
    revalidatePath("/admin/vwtypes");
    revalidatePath("/admin/videos");
    revalidatePath("/");
    revalidatePath("/type");
    revalidatePath(`/type/${vwTypeToDelete.slug}`);
    return { success: true, message: "VWType deleted successfully." };
  } catch (error) {
    console.error(`Error deleting VWType with ID ${id}:`, error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        message:
          "Failed to delete VWType because it is still in use by other records.",
      };
    }
    return {
      success: false,
      message: `Failed to delete VWType with ID ${id}.`,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

// Bulk Delete VWTypes
export async function bulkDeleteVWTypes(
  ids: number[],
): Promise<ActionResponse> {
  if (!ids || ids.length === 0) {
    return { success: false, message: "No VWType IDs provided for deletion." };
  }
  try {
    const deleteResult = await prisma.vWType.deleteMany({
      where: { id: { in: ids } },
    });
    revalidatePath("/admin/vwtypes");
    revalidatePath("/admin/videos");
    revalidatePath("/");
    return {
      success: true,
      message: `${deleteResult.count} VWType(s) deleted successfully.`,
      count: deleteResult.count,
    };
  } catch (error) {
    console.error("Error bulk deleting VWTypes:", error);
    return {
      success: false,
      message: "Failed to bulk delete VWTypes.",
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

// Bulk Generate Slugs for VWTypes
export async function bulkGenerateSlugsForVWTypes(
  ids: number[],
): Promise<ActionResponse> {
  if (!ids || ids.length === 0) {
    return {
      success: false,
      message: "No VWType IDs provided for slug generation.",
    };
  }
  let updatedCount = 0;
  const errors: string[] = [];

  for (const id of ids) {
    const vwType = await prisma.vWType.findUnique({
      where: { id },
      select: { name: true, slug: true }, // Ensure slug is selected
    });

    if (!vwType) {
      errors.push(`VWType with ID ${id} not found.`);
      continue;
    }
    if (!vwType.name) {
      errors.push(`VWType ID ${id} has no name, cannot generate slug.`);
      continue;
    }

    const newSlug = slugify(vwType.name, { lower: true, strict: true });
    const oldSlug = vwType.slug; // Capture old slug

    if (newSlug === oldSlug) {
      continue;
    }

    try {
      await prisma.vWType.update({
        where: { id },
        data: { slug: newSlug },
      });
      updatedCount++;
      if (oldSlug) {
        revalidatePath(`/type/${oldSlug}`);
      }
      revalidatePath(`/type/${newSlug}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        errors.push(
          `Could not update slug for VWType ID ${id} (name: ${vwType.name}) as the generated slug likely conflicts with an existing one.`,
        );
      } else {
        errors.push(
          `Error processing VWType ID ${id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
      console.error(`Error generating slug for VWType ID ${id}:`, error);
    }
  }

  if (updatedCount > 0) {
    revalidatePath("/admin/vwtypes");
    revalidatePath("/admin/videos");
    revalidatePath("/");
    revalidatePath("/type");
  }

  // Return results
  const message = `Successfully generated/updated slugs for ${updatedCount} VWType(s).`;
  if (errors.length > 0) {
    return {
      success: updatedCount > 0,
      message: `${message} ${errors.length} error(s) occurred: ${errors.join("; ")}`,
      error: errors.join("; "),
      count: updatedCount,
    };
  }
  return { success: true, message, count: updatedCount };
}

// Fetch all VWTypes for navigation/form selection (simplified)
export async function fetchNavigationVWTypes(): Promise<
  ActionResponse<{ id: number; name: string; slug: string }[]>
> {
  try {
    const vwTypes = await prisma.vWType.findMany({
      where: {
        NOT: {
          slug: "all",
        },
      },
      select: { id: true, name: true, slug: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return {
      success: true,
      message: "Navigation VW Types fetched successfully.",
      data: vwTypes,
    };
  } catch (error) {
    console.error("Error fetching navigation VW Types:", error);
    return {
      success: false,
      message: "Failed to fetch navigation VW Types.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

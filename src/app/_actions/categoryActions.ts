"use server";

import { prisma } from "@/lib/db";

export interface CategoryBasicInfo {
  id: number;
  name: string;
  slug: string;
}

export async function getAllCategories(): Promise<CategoryBasicInfo[]> {
  try {
    const categories = await prisma.category.findMany({
      where: {
        NOT: {
          name: {
            equals: "Uncategorized",
            mode: "insensitive", // Case-insensitive comparison
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return categories.map((category) => ({
      ...category,
      slug: category.slug!,
    }));
  } catch (error) {
    console.error("Error fetching all categories:", error);
    return [];
  }
}

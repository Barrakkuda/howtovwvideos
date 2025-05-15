"use server";

import { prisma } from "@/lib/db";

export interface NavigationVWType {
  id: number;
  name: string;
  slug: string;
}

export async function fetchNavigationVWTypes(): Promise<{
  success: boolean;
  data?: NavigationVWType[];
  error?: string;
}> {
  try {
    const vwTypes = await prisma.vWType.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        // description: true, // If needed for tooltips or other UI
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      // where: { videos: { some: { video: { status: "PUBLISHED" } } } } // Optional: Only show types with published videos
    });
    return { success: true, data: vwTypes };
  } catch (error) {
    console.error("Error fetching navigation VWTypes:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch VWTypes for navigation",
    };
  }
}

// This file is effectively being moved from src/app/videos/type/[vwType]/page.tsx
// to src/app/video/type/[vwType]/page.tsx.
// The content of the file remains the same.

import VideoGrid from "@/components/video/VideoGrid";
import { prisma } from "@/lib/db"; // Import prisma client
import { type VWType as VWTypeModel } from "@generated/prisma"; // Import the VWType model type
import { notFound } from "next/navigation";
import { Metadata } from "next"; // Import Metadata type

// Removed VWTypePageProps interface, will type props inline

// Fetch VWType by slug from the database
async function getVWTypeBySlug(
  slug: string | undefined,
): Promise<VWTypeModel | null> {
  if (!slug) return null;
  try {
    const vwType = await prisma.vWType.findUnique({
      where: { slug },
    });
    return vwType;
  } catch (error) {
    console.error(`Error fetching VWType by slug '${slug}':`, error);
    return null;
  }
}

// Helper function to format VWType names for display
function formatVWTypeName(name: string): string {
  // The name field from the DB should already be well-formatted (e.g., "Off-Road", "Type 3")
  // If not, specific formatting can be added here based on the name string.
  // For now, assume names like "Beetle", "Ghia", "Off-Road", "Type 3", "Type 4" are stored directly.
  return name;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>; // Explicitly type params for generateMetadata
}): Promise<Metadata> {
  const vwTypeSlug = (await params).slug;
  const vwTypeData = await getVWTypeBySlug(vwTypeSlug);

  if (!vwTypeData) {
    return {
      title: "Invalid VW Type",
      description: "The requested VW type does not exist.",
    };
  }
  const typeName = formatVWTypeName(vwTypeData.name);
  return {
    title: `${typeName} Videos | How-To VW Videos`,
    description: `Browse all ${typeName} videos on How-To VW Videos.`,
  };
}

export async function generateStaticParams() {
  try {
    const vwTypes = await prisma.vWType.findMany({
      select: { slug: true },
    });
    return vwTypes.map((type: { slug: string }) => ({
      slug: type.slug,
    }));
  } catch (error) {
    console.error(
      "Error fetching VWType slugs for generateStaticParams:",
      error,
    );
    return [];
  }
}

export default async function VWTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>; // Explicitly type params for the page component
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>; // Explicitly type searchParams
}) {
  const vwTypeSlug = (await params).slug;
  const vwTypeData = await getVWTypeBySlug(vwTypeSlug);

  if (!vwTypeData) {
    notFound(); // If type is invalid (slug not found), show 404 page
  }

  const pageSearchParam = (await searchParams)?.page;
  const currentPage =
    pageSearchParam && typeof pageSearchParam === "string"
      ? parseInt(pageSearchParam, 10)
      : 1;
  // Basic validation for currentPage, ensure it's at least 1
  const validCurrentPage = Math.max(1, isNaN(currentPage) ? 1 : currentPage);

  const typeName = formatVWTypeName(vwTypeData.name);

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 sm:mb-8">{typeName} Videos</h1>
      <VideoGrid
        currentPage={validCurrentPage}
        vwTypeSlug={vwTypeData.slug} // Pass slug to VideoGrid (VideoGrid will need update)
      />
    </>
  );
}

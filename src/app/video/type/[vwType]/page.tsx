// This file is effectively being moved from src/app/videos/type/[vwType]/page.tsx
// to src/app/video/type/[vwType]/page.tsx.
// The content of the file remains the same.

import VideoGrid from "@/components/video/VideoGrid";
import { VWType } from "@generated/prisma";
import { notFound } from "next/navigation";

interface VWTypePageProps {
  params: { vwType: string };
  searchParams?: { page?: string };
}

// Helper to validate and convert string to VWType enum
function getValidVWType(typeString: string | undefined): VWType | undefined {
  if (!typeString) return undefined;
  const upperTypeString = typeString.toUpperCase();
  if (Object.values(VWType).includes(upperTypeString as VWType)) {
    return upperTypeString as VWType;
  }
  return undefined;
}

// Helper function to format VWType names for display
function formatVWTypeName(vwType: VWType): string {
  switch (vwType) {
    case VWType.OFF_ROAD:
      return "Off-Road";
    case VWType.TYPE3:
      return "Type 3";
    case VWType.TYPE4:
      return "Type 4";
    default:
      // Default formatting for other types (e.g., Beetle, Ghia, Bus, Thing)
      return vwType.charAt(0).toUpperCase() + vwType.slice(1).toLowerCase();
  }
}

export async function generateMetadata({ params }: VWTypePageProps) {
  const vwTypeSlug = params.vwType;
  const vwTypeEnum = getValidVWType(vwTypeSlug);

  if (!vwTypeEnum) {
    return {
      title: "Invalid VW Type",
      description: "The requested VW type does not exist.",
    };
  }
  const typeName = formatVWTypeName(vwTypeEnum);
  return {
    title: `${typeName} Videos | How-To VW Videos`,
    description: `Browse all ${typeName} videos on How-To VW Videos.`,
  };
}

// Optional: generateStaticParams to pre-render pages for each VWType
export async function generateStaticParams() {
  return Object.values(VWType).map((type) => ({
    vwType: type.toLowerCase(), // Use lowercase for URL slugs
  }));
}

export default async function VWTypePage({
  params,
  searchParams,
}: VWTypePageProps) {
  const vwTypeSlug = params.vwType;
  const vwTypeEnum = getValidVWType(vwTypeSlug);

  if (!vwTypeEnum) {
    notFound(); // If type is invalid, show 404 page
  }

  const currentPage = searchParams?.page ? parseInt(searchParams.page, 10) : 1;
  if (isNaN(currentPage) || currentPage < 1) {
    // Handle invalid page number, perhaps redirect or default to 1
    // For now, defaulting to 1
  }

  const typeName = formatVWTypeName(vwTypeEnum);

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 sm:mb-8">{typeName} Videos</h1>
      <VideoGrid
        currentPage={currentPage > 0 ? currentPage : 1}
        vwType={vwTypeEnum}
      />
    </>
  );
}

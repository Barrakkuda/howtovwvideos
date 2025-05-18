import VideoGrid from "@/components/video/VideoGrid";
import { prisma } from "@/lib/db";
import { type VWType as VWTypeModel } from "@generated/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";

async function getVWTypeBySlug(
  slug: string | undefined,
): Promise<VWTypeModel | null> {
  if (!slug) {
    return null;
  }
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

function formatVWTypeName(name: string): string {
  return name;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
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
    title: `${typeName} Videos | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
    description: `Browse all ${typeName} videos on ${process.env.NEXT_PUBLIC_SITE_NAME}.`,
    openGraph: {
      title: `${typeName} Videos | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
      description: `Browse all ${typeName} videos on ${process.env.NEXT_PUBLIC_SITE_NAME}.`,
    },
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
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const vwTypeSlug = (await params).slug;

  // If the slug is "all", immediately show a 404 page as we don't want a dedicated "all" page.
  if (vwTypeSlug === "all") {
    notFound();
  }

  // For any other slug, proceed to fetch the VWType data.
  const vwTypeData = await getVWTypeBySlug(vwTypeSlug);

  if (!vwTypeData) {
    // If the specific VWType (e.g., "beetle") is not found in the database, show 404.
    notFound();
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
      <VideoGrid currentPage={validCurrentPage} vwTypeSlug={vwTypeData.slug} />
    </>
  );
}

import VideoGrid from "@/components/video/VideoGrid";
import { prisma } from "@/lib/db";
import { type Category as CategoryModel } from "@generated/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";

async function getCategoryBySlug(
  slug: string | undefined,
): Promise<CategoryModel | null> {
  if (!slug) return null;
  try {
    const category = await prisma.category.findUnique({
      where: { slug },
    });
    return category;
  } catch (error) {
    console.error(`Error fetching Category by slug '${slug}':`, error);
    return null;
  }
}

// Helper function to format Category names (if needed, like VWType)
function formatCategoryName(name: string): string {
  return name; // Assuming names are stored ready for display
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const categorySlug = (await params).slug;
  const categoryData = await getCategoryBySlug(categorySlug);

  if (!categoryData) {
    return {
      title: "Invalid Category",
      description: "The requested category does not exist.",
    };
  }
  const categoryName = formatCategoryName(categoryData.name);
  return {
    title: `${categoryName} Videos | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
    description: `Browse all ${categoryName} videos on ${process.env.NEXT_PUBLIC_SITE_NAME}.`,
    openGraph: {
      title: `${categoryName} Videos | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
      description: `Browse all ${categoryName} videos on ${process.env.NEXT_PUBLIC_SITE_NAME}.`,
    },
  };
}

export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({
      select: { slug: true },
      where: { slug: { not: null } }, // Only include categories that have a slug
    });
    return categories.map((cat: { slug: string | null }) => ({
      slug: cat.slug as string, // slug is guaranteed by where clause
    }));
  } catch (error) {
    console.error(
      "Error fetching Category slugs for generateStaticParams:",
      error,
    );
    return [];
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const categorySlug = (await params).slug;

  // Here, decide if you want a special "all" category page and how to handle it.
  // For now, we assume all slugs correspond to actual categories.
  // If you had a category with slug "all" you wanted to exclude, you'd add:
  // if (categorySlug === "all") { notFound(); }

  const categoryData = await getCategoryBySlug(categorySlug);

  if (!categoryData) {
    notFound();
  }

  const pageSearchParam = (await searchParams)?.page;
  const currentPage =
    pageSearchParam && typeof pageSearchParam === "string"
      ? parseInt(pageSearchParam, 10)
      : 1;
  const validCurrentPage = Math.max(1, isNaN(currentPage) ? 1 : currentPage);

  const categoryName = formatCategoryName(categoryData.name);

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 sm:mb-8">{categoryName} Videos</h1>
      <VideoGrid
        currentPage={validCurrentPage}
        categorySlug={categoryData.slug ?? undefined}
      />
    </>
  );
}

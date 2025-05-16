import { Metadata } from "next";
import VideoGrid from "@/components/video/VideoGrid";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

// Generate metadata based on search query
export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const query = (await searchParams).q as string | undefined;

  if (!query) {
    return {
      title: `Search Results | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
      description: `Search results in ${process.env.NEXT_PUBLIC_SITE_NAME}`,
    };
  }

  return {
    title: `Search Results for "${query}" | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
    description: `Search results for "${query}" in ${process.env.NEXT_PUBLIC_SITE_NAME}`,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = (await searchParams).q as string | undefined;

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 sm:mb-8">
        Search Results for &quot;{query}&quot;
      </h1>
      <VideoGrid searchQuery={query} />
    </>
  );
}

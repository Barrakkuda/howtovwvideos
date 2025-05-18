import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTagBySlug } from "@/app/(public)/tag/_actions/tagActions";
import VideoGrid from "@/components/video/VideoGrid";

interface TagPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const tagSlug = (await params).slug;
  const result = await getTagBySlug(tagSlug);

  if (!result.success || !result.data) {
    return {
      title: "Tag Not Found",
    };
  }
  const tag = result.data;
  return {
    title: `${tag.name} Videos | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
    description: tag.description || `Watch videos tagged with ${tag.name}.`,
    openGraph: {
      title: `${tag.name} Videos | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
      description: tag.description || `Watch videos tagged with ${tag.name}.`,
    },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const tagSlug = (await params).slug;
  const currentPage = (await searchParams).page
    ? parseInt((await searchParams).page as string, 10)
    : 1;

  const tagResult = await getTagBySlug(tagSlug);

  if (!tagResult.success || !tagResult.data) {
    notFound();
  }

  const tag = tagResult.data;

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 sm:mb-8">{tag.name} Videos</h1>
      {tag.description && (
        <p className="text-xl text-muted-foreground mb-6 sm:mb-8 -mt-4 sm:-mt-6">
          {tag.description}
        </p>
      )}
      <VideoGrid tagSlug={tagSlug} currentPage={currentPage} />
    </>
  );
}

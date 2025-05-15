import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTagBySlug } from "@/app/tags/_actions/tagActions";
import VideoGrid from "@/components/video/VideoGrid";
// import PageHeader from "@/components/layout/PageHeader"; // Assuming you have a generic PageHeader

interface TagPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    page?: string;
  };
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const tagSlug = params.slug;
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
      // Add an image URL if available, e.g., from the first video or a default tag image
    },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const tagSlug = params.slug;
  const currentPage = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  const tagResult = await getTagBySlug(tagSlug);

  if (!tagResult.success || !tagResult.data) {
    notFound();
  }

  const tag = tagResult.data;

  // The getTagBySlug action already fetches associated published videos.
  // However, VideoGrid has its own fetchPublishedVideos which includes pagination.
  // We will let VideoGrid handle fetching its own videos based on the tagSlug.

  return (
    <>
      {/* <PageHeader
        title={tag.name}
        description={tag.description || undefined}
        // breadcrumbs={[
        //   { name: "Home", href: "/" },
        //   { name: "Tags", href: "/tags" }, // Assuming a future /tags listing page
        //   { name: tag.name },
        // ]}
      /> */}
      <h1 className="text-3xl font-bold mb-6 sm:mb-8">{tag.name} Videos</h1>
      {tag.description && (
        <p className="text-xl text-muted-foreground mb-6 sm:mb-8 -mt-4 sm:-mt-6">
          {tag.description}
        </p>
      )}
      <VideoGrid
        tagSlug={tagSlug}
        currentPage={currentPage}
        itemsPerPage={20} // Or your desired default
      />
    </>
  );
}

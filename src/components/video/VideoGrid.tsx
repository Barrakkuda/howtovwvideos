import { prisma } from "@/lib/db";
import VideoCard from "./VideoCard"; // Assuming VideoCardProps exports the video shape it needs
import PaginationControls from "@/components/ui/PaginationControls";
import { VideoStatus } from "@generated/prisma";

interface VideoGridProps {
  currentPage?: number;
  itemsPerPage?: number;
  vwTypeSlug?: string;
  categorySlug?: string;
  tagSlug?: string;
  // Add other filter props here later, e.g.:
  // searchQuery?: string;
  // tags?: string[];
}

// Helper to ensure video data matches what VideoCard expects
// This should align with VideoCardProps.video and the data fetched from Prisma
// We'll refine this as we connect actual data.
interface VideoForCardDisplay {
  id: number;
  slug: string;
  title: string;
  thumbnailUrl?: string | null;
  url?: string | null; // For linking, can be derived if using local video pages
  // Add any other fields VideoCard will use, like channelTitle
}

async function fetchPublishedVideos({
  page = 1,
  limit = 24, // Default items per page
  vwTypeSlug,
  categorySlug,
  tagSlug,
}: {
  page?: number;
  limit?: number;
  vwTypeSlug?: string;
  categorySlug?: string;
  tagSlug?: string;
}): Promise<{
  videos: VideoForCardDisplay[];
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalVideos: number;
}> {
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {
    status: VideoStatus.PUBLISHED,
    isHowToVWVideo: true, // Assuming we only want to show these on the homepage grid
    slug: { not: null }, // Add slug requirement to the where clause
  };

  if (vwTypeSlug) {
    whereClause.vwTypes = {
      some: {
        OR: [{ vwType: { slug: vwTypeSlug } }, { vwType: { slug: "all" } }],
      },
    };
  } else if (categorySlug) {
    whereClause.categories = {
      some: {
        category: { slug: categorySlug },
      },
    };
  } else if (tagSlug) {
    whereClause.tags = {
      some: {
        tag: { slug: tagSlug },
      },
    };
  }

  const totalVideos = await prisma.video.count({
    where: whereClause,
  });

  const videosData = await prisma.video.findMany({
    where: whereClause,
    skip: skip,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      slug: true,
      title: true,
      thumbnailUrl: true,
      videoId: true,
    },
  });

  // Since we're filtering by slug in the query, we can safely cast it as string
  const videos: VideoForCardDisplay[] = videosData.map((v) => ({
    id: v.id,
    slug: v.slug as string, // Safe to cast since we filtered in the query
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    url: `/video/${v.slug}`,
  }));

  const totalPages = Math.ceil(totalVideos / limit);

  return {
    videos,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    totalVideos,
  };
}

export default async function VideoGrid({
  currentPage = 1,
  itemsPerPage = 24,
  vwTypeSlug,
  categorySlug,
  tagSlug,
}: VideoGridProps) {
  const {
    videos,
    totalPages,
    currentPage: actualCurrentPage, // Renamed to avoid conflict with prop
    hasNextPage,
    hasPrevPage,
    totalVideos,
  } = await fetchPublishedVideos({
    page: currentPage,
    limit: itemsPerPage,
    vwTypeSlug,
    categorySlug,
    tagSlug,
  });

  if (totalVideos === 0) {
    let messageDetail =
      "There are currently no published videos matching your criteria.";
    if (vwTypeSlug) {
      messageDetail = `There are currently no published videos for the type "${vwTypeSlug.replace(/-/g, " ")}".`;
    } else if (categorySlug) {
      messageDetail = `There are currently no published videos for the category "${categorySlug.replace(/-/g, " ")}".`;
    } else if (tagSlug) {
      messageDetail = `There are currently no published videos for the tag "${tagSlug.replace(/-/g, " ")}".`;
    }
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">No Videos Found</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          {messageDetail} Please check back later or try a different search.
        </p>
      </div>
    );
  }

  // Determine basePath for pagination
  let basePath = "/";
  if (vwTypeSlug) {
    basePath = `/type/${vwTypeSlug}`;
  } else if (categorySlug) {
    basePath = `/category/${categorySlug}`;
  } else if (tagSlug) {
    basePath = `/tag/${tagSlug}`;
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      <PaginationControls
        currentPage={actualCurrentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        basePath={basePath} // Use dynamic basePath
      />
    </div>
  );
}

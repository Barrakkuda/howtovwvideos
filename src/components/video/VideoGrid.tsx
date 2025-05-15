import { prisma } from "@/lib/db";
import VideoCard from "./VideoCard"; // Assuming VideoCardProps exports the video shape it needs
import PaginationControls from "@/components/ui/PaginationControls";
import { VideoStatus, VWType } from "@generated/prisma";

interface VideoGridProps {
  currentPage?: number;
  itemsPerPage?: number;
  vwType?: VWType;
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
  limit = 20, // Default items per page
  vwType,
}: {
  page?: number;
  limit?: number;
  vwType?: VWType;
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
    // Add other filters based on props like searchQuery, vwType, tags here
  };

  if (vwType) {
    whereClause.vwTypes = { has: vwType };
  }

  const totalVideos = await prisma.video.count({
    where: whereClause,
  });

  const videosData = await prisma.video.findMany({
    where: whereClause,
    skip: skip,
    take: limit,
    orderBy: {
      createdAt: "desc", // Or by publication date, views, etc.
    },
    select: {
      // Select only the fields needed for VideoForCardDisplay
      id: true,
      slug: true,
      title: true,
      thumbnailUrl: true,
      videoId: true, // To construct URL if needed, or use a slug field
      // channelTitle: true, // Example
    },
  });

  // Map to the structure VideoCard expects
  const videos: VideoForCardDisplay[] = videosData
    .filter((v) => v.slug !== null) // Filter out videos without a slug
    .map((v) => ({
      id: v.id,
      slug: v.slug as string, // Slug is now guaranteed to be a string
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      url: `/video/${v.slug}`, // Construct URL with the non-null slug
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
  itemsPerPage = 20,
  vwType,
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
    vwType,
  });

  if (totalVideos === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">No Videos Found</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          {vwType
            ? `There are currently no published videos for the type "${vwType.toLowerCase()}".`
            : "There are currently no published videos matching your criteria."}
          Please check back later or try a different search.
        </p>
      </div>
    );
  }

  // Determine basePath for pagination
  const basePath = vwType ? `/videos/type/${vwType.toLowerCase()}` : "/";

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

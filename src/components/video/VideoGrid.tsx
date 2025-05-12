import { prisma } from "@/lib/db";
import VideoCard, { VideoCardProps } from "./VideoCard"; // Assuming VideoCardProps exports the video shape it needs
import PaginationControls from "@/components/ui/PaginationControls";
import { VideoStatus } from "@generated/prisma";

interface VideoGridProps {
  currentPage?: number;
  itemsPerPage?: number;
  // Add other filter props here later, e.g.:
  // searchQuery?: string;
  // vwType?: string;
  // tags?: string[];
}

// Helper to ensure video data matches what VideoCard expects
// This should align with VideoCardProps.video and the data fetched from Prisma
// We'll refine this as we connect actual data.
interface VideoForCardDisplay {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  url?: string | null; // For linking, can be derived if using local video pages
  // Add any other fields VideoCard will use, like channelTitle
}

async function fetchPublishedVideos({
  page = 1,
  limit = 12, // Default items per page
}: {
  page?: number;
  limit?: number;
}): Promise<{
  videos: VideoForCardDisplay[];
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalVideos: number;
}> {
  const skip = (page - 1) * limit;

  const whereClause = {
    status: VideoStatus.PUBLISHED,
    isHowToVWVideo: true, // Assuming we only want to show these on the homepage grid
    // Add other filters based on props like searchQuery, vwType, tags here
  };

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
      title: true,
      thumbnailUrl: true,
      videoId: true, // To construct URL if needed, or use a slug field
      // channelTitle: true, // Example
    },
  });

  // Map to the structure VideoCard expects
  const videos: VideoForCardDisplay[] = videosData.map((v) => ({
    id: v.id,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl, // Reverted: Use the URL directly from DB
    url: `/videos/${v.id}`, // Assuming detail page structure: /videos/[id]
    // If you have a slug: url: `/videos/${v.slug}`,
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
  itemsPerPage = 12,
}: VideoGridProps) {
  const {
    videos,
    totalPages,
    currentPage: actualCurrentPage, // Renamed to avoid conflict with prop
    hasNextPage,
    hasPrevPage,
    totalVideos,
  } = await fetchPublishedVideos({ page: currentPage, limit: itemsPerPage });

  if (totalVideos === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">No Videos Found</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          There are currently no published videos matching your criteria. Please
          check back later or try a different search.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video as VideoCardProps["video"]} />
        ))}
      </div>
      <PaginationControls
        currentPage={actualCurrentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        basePath="/" // Or the relevant base path for the homepage/video listing
      />
    </div>
  );
}

import { prisma } from "@/lib/db";
import VideoCard, { type CategoryInfo } from "./VideoCard"; // Assuming VideoCardProps and CategoryInfo are exported
import PaginationControls from "@/components/ui/PaginationControls";
import { VideoStatus, Prisma } from "@generated/prisma";
import { redirect } from "next/navigation";
import { SearchLoggerClient } from "./SearchLoggerClient"; // Import the new client component

interface VideoGridProps {
  currentPage?: number;
  itemsPerPage?: number;
  vwTypeSlug?: string;
  categorySlug?: string;
  tagSlug?: string;
  searchQuery?: string;
}

// Helper to ensure video data matches what VideoCard expects
interface VideoForCardDisplay {
  id: number;
  slug: string;
  title: string;
  thumbnailUrl?: string | null;
  url?: string | null;
  categories?: CategoryInfo[];
}

async function fetchPublishedVideos({
  page = 1,
  limit = 24,
  vwTypeSlug,
  categorySlug,
  tagSlug,
  searchQuery,
}: {
  page?: number;
  limit?: number;
  vwTypeSlug?: string;
  categorySlug?: string;
  tagSlug?: string;
  searchQuery?: string;
}): Promise<{
  videos: VideoForCardDisplay[];
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalVideos: number;
}> {
  const skip = (page - 1) * limit;

  const whereClause: Prisma.VideoWhereInput = {
    status: VideoStatus.PUBLISHED,
    isHowToVWVideo: true,
    slug: { not: null },
  };

  // Add search query if provided
  if (searchQuery) {
    whereClause.OR = [
      { title: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

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
      categories: {
        select: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  const videos: VideoForCardDisplay[] = videosData.map((v) => ({
    id: v.id,
    slug: v.slug as string,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    url: `/video/${v.slug}`,
    categories: v.categories.map((catOnVideo) => ({
      id: catOnVideo.category.id,
      name: catOnVideo.category.name,
      slug: catOnVideo.category.slug!,
    })),
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
  searchQuery,
}: VideoGridProps) {
  // First, fetch the total count to validate the page number
  const whereClause: Prisma.VideoWhereInput = {
    status: VideoStatus.PUBLISHED,
    isHowToVWVideo: true,
    slug: { not: null },
  };

  // Add search query if provided
  if (searchQuery) {
    whereClause.OR = [
      { title: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

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

  const totalPages = Math.ceil(totalVideos / itemsPerPage);

  // Validate page number
  let actualCurrentPage = currentPage;
  if (currentPage < 1 || (totalPages > 0 && currentPage > totalPages)) {
    // Determine the base path for redirection
    let basePath = "/";
    if (searchQuery) {
      basePath = `/search?q=${encodeURIComponent(searchQuery)}`;
    } else if (vwTypeSlug) {
      basePath = `/type/${vwTypeSlug}`;
    } else if (categorySlug) {
      basePath = `/category/${categorySlug}`;
    } else if (tagSlug) {
      basePath = `/tag/${tagSlug}`;
    }

    if (totalPages > 0 && currentPage > totalPages) {
      actualCurrentPage = totalPages; // or 1, or redirect
      redirect(`${basePath}?page=${totalPages > 0 ? totalPages : 1}`);
    } else if (currentPage < 1) {
      actualCurrentPage = 1;
      redirect(`${basePath}?page=1`);
    }
    // If totalPages is 0, currentPage will be 1, no redirect needed unless it was explicitly < 1
  }

  // If we get here, the page number is valid, so fetch the videos
  const { videos, hasNextPage, hasPrevPage } = await fetchPublishedVideos({
    page: actualCurrentPage,
    limit: itemsPerPage,
    vwTypeSlug,
    categorySlug,
    tagSlug,
    searchQuery,
  });

  if (totalVideos === 0) {
    let messageDetail =
      "There are currently no published videos matching your criteria.";
    if (searchQuery) {
      messageDetail = `No videos found matching "${searchQuery}". Try different search terms.`;
    } else if (vwTypeSlug) {
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
  if (searchQuery) {
    basePath = `/search?q=${encodeURIComponent(searchQuery)}`;
  } else if (vwTypeSlug) {
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
        basePath={basePath}
      />
      {searchQuery && totalVideos >= 0 && (
        <SearchLoggerClient
          searchQuery={searchQuery}
          totalVideos={totalVideos}
        />
      )}
    </div>
  );
}

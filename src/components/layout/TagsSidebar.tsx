import { prisma } from "@/lib/db";
import Link from "next/link";
import { VideoStatus } from "@generated/prisma";

async function fetchPopularTags(limit: number = 20): Promise<string[]> {
  try {
    // Aggregate tags from published, HowToVWVideo videos
    const videosWithTags = await prisma.video.findMany({
      where: {
        status: VideoStatus.PUBLISHED,
        isHowToVWVideo: true,
        tags: {
          isEmpty: false, // Ensure the tags array is not empty
        },
      },
      select: {
        tags: true,
      },
    });

    const tagCounts: Record<string, number> = {};
    videosWithTags.forEach((video) => {
      video.tags.forEach((tag) => {
        const normalizedTag = tag.trim().toLowerCase(); // Normalize tags
        if (normalizedTag) {
          tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
        }
      });
    });

    // Sort tags by frequency and take the top 'limit'
    const sortedTags = Object.entries(tagCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, limit)
      .map(([tag]) => tag);

    // Optional: Capitalize tags for display
    return sortedTags.map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1));
  } catch (error) {
    console.error("Error fetching popular tags:", error);
    return []; // Return empty array on error
  }
}

export default async function TagsSidebar() {
  const tags = await fetchPopularTags(25); // Fetch top 25 tags

  if (!tags || tags.length === 0) {
    return (
      <aside className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg shadow w-full md:w-64 lg:w-72">
        <h3 className="text-lg font-semibold mb-3 text-neutral-800 dark:text-neutral-100">
          Popular Tags
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No tags available at the moment.
        </p>
      </aside>
    );
  }

  return (
    <aside className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg shadow w-full md:w-64 lg:w-72">
      <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-100">
        Popular Tags
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/videos?tag=${encodeURIComponent(tag.toLowerCase())}`}
            className="bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-700 dark:text-blue-100 dark:hover:bg-blue-600 text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
          >
            {tag}
          </Link>
        ))}
      </div>
    </aside>
  );
}

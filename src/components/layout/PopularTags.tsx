import { prisma } from "@/lib/db";
import Link from "next/link";
import { VideoStatus } from "@generated/prisma";
import { TagsIcon } from "lucide-react";

async function fetchPopularTags(limit: number = 20): Promise<string[]> {
  try {
    const videosWithTags = await prisma.video.findMany({
      where: {
        status: VideoStatus.PUBLISHED,
        isHowToVWVideo: true,
        tags: {
          isEmpty: false,
        },
      },
      select: {
        tags: true,
      },
    });

    const tagCounts: Record<string, number> = {};
    videosWithTags.forEach((video) => {
      video.tags.forEach((tag) => {
        const normalizedTag = tag.trim().toLowerCase();
        if (normalizedTag) {
          tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
        }
      });
    });

    const sortedTags = Object.entries(tagCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, limit)
      .map(([tag]) => tag);

    return sortedTags.map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1));
  } catch (error) {
    console.error("Error fetching popular tags:", error);
    return [];
  }
}

export default async function PopularTags() {
  const tags = await fetchPopularTags(25);

  if (!tags || tags.length === 0) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-neutral-800 dark:text-neutral-100 flex items-center">
          <TagsIcon className="mr-2 h-5 w-5" /> Popular Tags
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No tags available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-100 flex items-center">
        <TagsIcon className="mr-2 h-5 w-5" /> Popular Tags
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/videos?tag=${encodeURIComponent(tag.toLowerCase())}`}
            className="block text-sm text-neutral-600 hover:text-blue-600 dark:text-neutral-300 dark:hover:text-blue-400 transition-colors py-1 px-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}

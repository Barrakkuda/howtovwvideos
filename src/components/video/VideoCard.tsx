"use client";

import Image from "next/image";
import Link from "next/link";

// Define category structure
export interface CategoryInfo {
  id: number;
  name: string;
  slug: string;
}

export interface VideoCardProps {
  video: {
    id: number;
    slug: string;
    title: string;
    thumbnailUrl?: string | null;
    url?: string | null;
    categories?: CategoryInfo[];
  };
}

export default function VideoCard({ video }: VideoCardProps) {
  const defaultThumbnail = "/images/placeholder-thumbnail.svg";
  const videoLink = video.url || `/video/${video.slug}`;

  return (
    <div className="transition-all flex flex-col h-full">
      <Link href={videoLink} className="group flex flex-col h-full">
        <div className="rounded-lg overflow-hidden relative w-full aspect-video bg-neutral-200 dark:bg-neutral-700">
          <Image
            src={video.thumbnailUrl || defaultThumbnail}
            alt={`Thumbnail for ${video.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority={false}
          />
        </div>
        <div className="py-3 md:px-2.5 flex-grow flex flex-col justify-between">
          <div>
            {/* Wrapper for title and badges */}
            <h3
              className="text-md font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 overflow-hidden mb-1.5"
              style={{ display: "-webkit-box", WebkitBoxOrient: "vertical" }}
              title={video.title}
            >
              {video.title}
            </h3>
            {video.categories && video.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {video.categories.slice(0, 3).map(
                  (
                    category, // Show up to 3 categories
                  ) => (
                    <span
                      key={category.id}
                      className="inline-block text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 px-2 py-0.5 rounded-full transition-colors whitespace-nowrap cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      title={category.name}
                    >
                      {category.name}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

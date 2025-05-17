"use client"; // If it includes client-side interactions like Link or event handlers in future

import Image from "next/image";
import Link from "next/link";

// Define a basic type for the video prop.
// This should be refined to match the actual data structure of your videos.
export interface CategoryInfo {
  id: number;
  name: string;
  slug: string;
}

export interface VideoCardProps {
  video: {
    id: number; // Assuming video has an ID for the link
    slug: string; // Assuming video has an ID for the link
    title: string;
    thumbnailUrl?: string | null;
    url?: string | null; // Link to the video detail page or external source
    categories?: CategoryInfo[];
    // Add other relevant fields like views, duration, uploader, etc. as needed
    // For example:
    // channelTitle?: string;
    // vwTypes?: string[]; // Or the actual VWType enum/object
  };
}

export default function VideoCard({ video }: VideoCardProps) {
  const defaultThumbnail = "/images/placeholder-thumbnail.svg"; // Provide a path to a default placeholder

  // Determine the link for the video.
  // For now, let's assume a video detail page like /videos/[id]
  // If it's an external link, video.url might be used directly.
  const videoLink = video.url || `/video/${video.slug}`;

  return (
    <div className="transition-all">
      <Link href={videoLink} className="block group">
        <div className="rounded-lg overflow-hidden relative w-full aspect-video bg-neutral-200 dark:bg-neutral-700">
          <Image
            src={video.thumbnailUrl || defaultThumbnail}
            alt={`Thumbnail for ${video.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority={false} // Set to true for above-the-fold images if applicable
          />
        </div>
        <div className="py-4">
          <h3
            className="text-md sm:text-md font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 overflow-hidden"
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
                  <Link
                    href={`/category/${category.slug}`}
                    key={category.id}
                    className="inline-block text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 px-2 py-0.5 rounded-full transition-colors whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()} // Prevent card link navigation when clicking badge
                  >
                    {category.name}
                  </Link>
                ),
              )}
            </div>
          )}
          {/* Optional: Add more details like channel, views, etc. */}
          {/* {video.channelTitle && ( */}
          {/*   <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate">{video.channelTitle}</p> */}
          {/* )} */}
        </div>
      </Link>
    </div>
  );
}

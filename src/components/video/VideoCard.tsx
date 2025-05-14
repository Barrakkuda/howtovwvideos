"use client"; // If it includes client-side interactions like Link or event handlers in future

import Image from "next/image";
import Link from "next/link";

// Define a basic type for the video prop.
// This should be refined to match the actual data structure of your videos.
export interface VideoCardProps {
  video: {
    id: number | string; // Assuming video has an ID for the link
    title: string;
    thumbnailUrl?: string | null;
    url?: string | null; // Link to the video detail page or external source
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
  const videoLink = video.url || `/video/${video.id}`;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl">
      <Link href={videoLink} className="block group">
        <div className="relative w-full aspect-video bg-neutral-200 dark:bg-neutral-700">
          <Image
            src={video.thumbnailUrl || defaultThumbnail}
            alt={`Thumbnail for ${video.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority={false} // Set to true for above-the-fold images if applicable
          />
        </div>
        <div className="p-4">
          <h3
            className="text-md sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate"
            title={video.title}
          >
            {video.title}
          </h3>
          {/* Optional: Add more details like channel, views, etc. */}
          {/* {video.channelTitle && ( */}
          {/*   <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate">{video.channelTitle}</p> */}
          {/* )} */}
        </div>
      </Link>
    </div>
  );
}

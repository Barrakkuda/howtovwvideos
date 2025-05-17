"use client"; // If it includes client-side interactions like Link or event handlers in future

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
    categories?: CategoryInfo[]; // Added categories
  };
}

export default function VideoCard({ video }: VideoCardProps) {
  const defaultThumbnail = "/images/placeholder-thumbnail.svg";
  const videoLink = video.url || `/video/${video.slug}`;

  return (
    // Ensuring the card maintains its visual structure.
    // The outer div was: "rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl"
    // Let's ensure those styles are present or similar.
    // The inner Link > div for image was: "relative w-full aspect-video bg-neutral-200 dark:bg-neutral-700"
    // and it had rounded-lg and overflow-hidden directly on it previously, let's stick to that for image container.

    <div className="rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl flex flex-col h-full">
      <Link href={videoLink} className="block group flex flex-col h-full">
        <div className="relative w-full aspect-video bg-neutral-200 dark:bg-neutral-700">
          {/* Removed rounded-lg and overflow-hidden from here as it's on parent now for the whole card */}
          <Image
            src={video.thumbnailUrl || defaultThumbnail}
            alt={`Thumbnail for ${video.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority={false}
          />
        </div>
        <div className="py-3 px-2.5 flex-grow flex flex-col justify-between">
          {" "}
          {/* Adjusted padding, added flex-grow */}
          <div>
            {" "}
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
                        e.stopPropagation(); // Prevent card link navigation
                        // If you need navigation, use router.push here, but ensure this span is focusable and has appropriate ARIA roles if it acts like a link
                        // For now, it just stops propagation and looks like a badge.
                        // import { useRouter } from 'next/navigation'; (at top of file)
                        // const router = useRouter(); (inside component)
                        // router.push(`/category/${category.slug}`);
                      }}
                      title={category.name} // Add title for accessibility
                    >
                      {category.name}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
          {/* Placeholder for any other content at the bottom of the card if needed */}
        </div>
      </Link>
    </div>
  );
}

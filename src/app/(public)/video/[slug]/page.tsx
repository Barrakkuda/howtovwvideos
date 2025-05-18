import { notFound } from "next/navigation";
import {
  getVideoBySlug,
  PublicVideoDetails,
} from "../_actions/publicVideoActions";
import { Metadata } from "next";
import { VideoStatus } from "@generated/prisma";
import { VideoDescription } from "@/components/video/VideoDescription";
import Image from "next/image";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Function to generate metadata (title, description)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const videoData: PublicVideoDetails | null = await getVideoBySlug(slug);

  if (!videoData || videoData.status !== VideoStatus.PUBLISHED) {
    return {
      title: "Video Not Found",
      description: "This video is not available or could not be found.",
    };
  }

  return {
    title: videoData.title + " | " + process.env.NEXT_PUBLIC_SITE_NAME,
    description: videoData.description || "Watch this How-To VW video.",
    openGraph: {
      title: videoData.title + " | " + process.env.NEXT_PUBLIC_SITE_NAME,
      description: videoData.description || "",
      type: "video.other",
      url: `https://${process.env.NEXT_PUBLIC_SITE_URL}/video/${videoData.slug}`,
      images: videoData.thumbnailUrl ? [{ url: videoData.thumbnailUrl }] : [],
    },
  };
}

export default async function PublicVideoPage({ params }: Props) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const videoData: PublicVideoDetails | null = await getVideoBySlug(slug);

  if (!videoData || videoData.status !== VideoStatus.PUBLISHED) {
    notFound();
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-4">{videoData.title}</h1>

      {/* Placeholder for Video Player */}
      <div className="aspect-video bg-gray-200 mb-6 flex items-center justify-center">
        {videoData.platform === "YOUTUBE" && videoData.videoId && (
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoData.videoId}`}
            title={videoData.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          ></iframe>
        )}

        {!videoData.videoId && (
          <p>Video player will be here. (Video ID missing for embed)</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h2 className="text-2xl font-semibold mb-3">Description</h2>
          <VideoDescription description={videoData.description} />
        </div>

        <aside className="md:col-span-1">
          <div className="bg-gray-800/50 rounded-lg p-6 shadow-lg border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-700/50">
              Details
            </h2>

            <div className="space-y-4">
              {videoData.channel && (
                <div className="flex items-start space-x-3">
                  {videoData.channel.thumbnailUrl && (
                    <Image
                      src={videoData.channel.thumbnailUrl}
                      alt={`${videoData.channel.name} channel avatar`}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-300">
                      Channel
                    </div>
                    <a
                      href={videoData.channel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {videoData.channel.name}
                    </a>
                    {videoData.channel.subscriberCount && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {videoData.channel.subscriberCount.toLocaleString()}{" "}
                        subscribers
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <div className="text-sm font-medium text-gray-300 mb-1">
                  Status
                </div>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700/50 text-gray-200">
                  {videoData.status}
                </div>
              </div>

              {videoData.categories && videoData.categories.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-300 mb-2">
                    Categories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {videoData.categories.map((catOnVideo) => (
                      <span
                        key={catOnVideo.categoryId}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-700/30 text-gray-200 hover:bg-gray-700/50 transition-colors"
                      >
                        {catOnVideo.category.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {videoData.vwTypes && videoData.vwTypes.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-300 mb-2">
                    VW Types
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {videoData.vwTypes.map((item) => (
                      <span
                        key={item.vwType.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-900/30 text-blue-200 hover:bg-blue-900/50 transition-colors"
                      >
                        {item.vwType.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {videoData.tags && videoData.tags.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-300 mb-2">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {videoData.tags.map((tagOnVideo) => (
                      <span
                        key={tagOnVideo.tag.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-900/30 text-purple-200 hover:bg-purple-900/50 transition-colors"
                      >
                        {tagOnVideo.tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

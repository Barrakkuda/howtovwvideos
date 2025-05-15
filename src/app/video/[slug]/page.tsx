import { notFound } from "next/navigation";
import {
  getVideoBySlug,
  PublicVideoDetails,
} from "../_actions/publicVideoActions";
import { Metadata } from "next";
import { VideoStatus } from "@generated/prisma";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Function to generate metadata (title, description)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const videoData: PublicVideoDetails | null = await getVideoBySlug(slug);

  if (!videoData || videoData.status !== VideoStatus.PUBLISHED) {
    // Optionally, return metadata for a 'not found' or 'private' page
    return {
      title: "Video Not Found",
      description: "This video is not available or could not be found.",
    };
  }

  // Optionally, access existing metadata from parent
  // const previousImages = (await parent).openGraph?.images || [];

  return {
    title: videoData.title + " | " + process.env.NEXT_PUBLIC_SITE_NAME,
    description: videoData.description || "Watch this How-To VW video.",
    openGraph: {
      title: videoData.title + " | " + process.env.NEXT_PUBLIC_SITE_NAME,
      description: videoData.description || "",
      type: "video.other",
      url: `https://${process.env.NEXT_PUBLIC_SITE_URL}/video/${videoData.slug}`, // Replace with your actual domain
      images: videoData.thumbnailUrl ? [{ url: videoData.thumbnailUrl }] : [],
      // You might also want to add video-specific OpenGraph tags if your video player supports them
      // e.g., video:secure_url, video:type, video:width, video:height
    },
  };
}

export default async function PublicVideoPage({ params }: Props) {
  const { slug } = await params;

  if (!slug) {
    notFound(); // Should not happen if route is [videoId]
  }

  const videoData: PublicVideoDetails | null = await getVideoBySlug(slug);

  if (!videoData || videoData.status !== VideoStatus.PUBLISHED) {
    // Render a 'not found' or 'private video' component, or redirect
    // For now, we'll use Next.js notFound to render the nearest not-found.tsx or a default 404
    notFound();
  }

  // TEMP: Display video data as JSON for now
  // Later, replace with actual components: VideoPlayer, VideoMetadataDisplay, etc.

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{videoData.title}</h1>

      {/* Placeholder for Video Player */}
      <div className="aspect-video bg-gray-200 mb-6 flex items-center justify-center">
        {videoData.platform === "YOUTUBE" && videoData.videoId && (
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoData.videoId}`} // Note: using videoData.videoId which is the YT ID
            title={videoData.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          ></iframe>
        )}
        {/* Add Vimeo player logic if needed */}
        {!videoData.videoId && (
          <p>Video player will be here. (Video ID missing for embed)</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h2 className="text-2xl font-semibold mb-3">Description</h2>
          <p className="text-gray-700 whitespace-pre-line mb-6">
            {videoData.description || "No description available."}
          </p>
        </div>

        <aside className="md:col-span-1">
          <h2 className="text-2xl font-semibold mb-3">Details</h2>
          {/* <VideoMetadataDisplay video={videoData} /> */}
          <div className="space-y-2 text-sm">
            {videoData.channelTitle && (
              <p>
                <strong>Channel:</strong> {videoData.channelTitle}
              </p>
            )}
            <p>
              <strong>Status:</strong> {videoData.status}
            </p>
            {videoData.categories && videoData.categories.length > 0 && (
              <div>
                <strong>Categories:</strong>
                <ul className="list-disc list-inside ml-4">
                  {videoData.categories.map((catOnVideo) => (
                    <li key={catOnVideo.categoryId}>
                      {catOnVideo.category.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {videoData.vwTypes && videoData.vwTypes.length > 0 && (
              <div>
                <strong>VW Types:</strong>
                <ul className="list-disc list-inside ml-4">
                  {videoData.vwTypes.map((vwType) => (
                    <li key={vwType}>{vwType}</li>
                  ))}
                </ul>
              </div>
            )}
            {videoData.tags && videoData.tags.length > 0 && (
              <div>
                <strong>Tags:</strong>
                <ul className="list-disc list-inside ml-4">
                  {videoData.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* TODO: Related Videos, Comments */}
    </div>
  );
}

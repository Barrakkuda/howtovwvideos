"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Category, VideoPlatform, Prisma } from "@generated/prisma";

import VideoForm from "@/components/admin/VideoForm";
import { updateVideo } from "@/app/admin/videos/_actions/videoActions";
import { VideoFormData } from "@/lib/validators/video";

// Define a more specific type for the video prop, including its relations
type CategoriesOnVideosWithCategory = Prisma.CategoriesOnVideosGetPayload<{
  include: { category: true };
}>;

// Define a more specific type for the video prop, including its relations
type VideoWithCategories = Prisma.VideoGetPayload<{
  include: {
    categories: {
      include: {
        category: true;
      };
    };
  };
}>;

interface EditVideoFormWrapperProps {
  video: VideoWithCategories; // Use the more specific type
  categories: Category[];
}

export default function EditVideoFormWrapper({
  video,
  categories,
}: EditVideoFormWrapperProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transform the Prisma Video object to VideoFormData for the form
  // This is important if your Video model has fields/types not directly usable by the form
  // or if VideoFormData has a slightly different structure.
  const initialFormData: Partial<VideoFormData> = {
    videoId: video.videoId,
    title: video.title,
    description: video.description || "", // Ensure description is not null for the form if schema expects string
    url: video.url || "",
    thumbnailUrl: video.thumbnailUrl || "", // Ensure thumbnailUrl is not null for the form if schema expects string
    categoryIds: video.categories.map(
      (cov: CategoriesOnVideosWithCategory) => cov.categoryId,
    ),
    status: video.status,
    platform: video.platform, // Add platform here
    transcript: video.transcript, // Add transcript here
    // Ensure all fields in VideoFormData are covered here if they exist in Video
  };

  // console.log("[EditVideoFormWrapper] Video URL:", video.url); // Log the video URL
  // const videoInfo = useMemo(() => {
  //   const info = getVideoPlatformInfo(video.url);
  //   console.log("[EditVideoFormWrapper] videoInfo from util:", info); // Log the result from util
  //   return info;
  // }, [video.url]);

  async function handleSubmitVideo(data: VideoFormData) {
    setIsSubmitting(true);
    try {
      const result = await updateVideo(video.id, data);
      if (result.success) {
        toast.success(result.message || "Video updated successfully!");
        router.push("/admin/videos"); // Navigate back to the videos list
        // router.refresh(); // Not strictly necessary if revalidatePath is working well from server action
      } else {
        let errorMessages = result.message || "An error occurred.";
        if (result.errors) {
          const fieldErrors = Object.entries(result.errors)
            .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
            .join("\n");
          errorMessages += `\n${fieldErrors}`;
        }
        toast.error(errorMessages);
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
    setIsSubmitting(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <VideoForm
          categories={categories}
          initialData={initialFormData} // Pass the transformed video data
          onSubmit={handleSubmitVideo}
          isSubmitting={isSubmitting}
        />
      </div>
      <div className="lg:col-span-1">
        {video.platform === VideoPlatform.YOUTUBE && video.videoId && (
          <div className="aspect-video bg-muted rounded-md overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${video.videoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        )}
        {video.platform === VideoPlatform.VIMEO && video.videoId && (
          <div className="aspect-video bg-muted rounded-md overflow-hidden">
            <iframe
              src={`https://player.vimeo.com/video/${video.videoId}`}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo video player"
            ></iframe>
          </div>
        )}
        {video.platform !== VideoPlatform.YOUTUBE &&
          video.platform !== VideoPlatform.VIMEO && (
            <div className="p-4 bg-muted rounded-md text-center">
              <p className="text-sm text-muted-foreground">
                Preview not available for this video platform ({video.platform}
                ).
              </p>
              {video.url && (
                <p className="text-xs text-muted-foreground mt-1">
                  Original URL: {video.url}
                </p>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VideoForm from "@/components/admin/VideoForm";
import { addVideo } from "@/app/admin/videos/_actions/videoActions"; // Corrected path
import { VideoFormData } from "@/lib/validators/video";
import { Category } from "@generated/prisma";
import { toast } from "sonner";

interface NewVideoFormWrapperProps {
  categories: Category[];
}

export default function NewVideoFormWrapper({
  categories,
}: NewVideoFormWrapperProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmitVideo(data: VideoFormData) {
    setIsSubmitting(true);
    try {
      const result = await addVideo(data);
      if (result.success) {
        toast.success(result.message || "Video added successfully!");
        router.push("/admin/videos");
        router.refresh(); // Force refresh of the page to reflect new data
      } else {
        let errorMessages = result.message || "An error occurred.";
        if (result.errors) {
          // Flatten Zod errors for display, if any
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
    <VideoForm
      categories={categories}
      onSubmit={handleSubmitVideo}
      isSubmitting={isSubmitting}
    />
  );
}

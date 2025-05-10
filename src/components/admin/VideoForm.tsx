"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Category, VideoStatus, VideoPlatform } from "@generated/prisma"; // Assuming Prisma client is in node_modules
import { useForm } from "react-hook-form";

import { videoSchema, VideoFormData } from "@/lib/validators/video";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// import { Checkbox } from "@/components/ui/checkbox"; // If using checkbox for status
import { useRouter } from "next/navigation";

interface VideoFormProps {
  categories: Category[];
  initialData?: Partial<VideoFormData>; // For editing
  onSubmit: (data: VideoFormData) => Promise<void>;
  isSubmitting: boolean;
}

export default function VideoForm({
  categories,
  initialData,
  onSubmit,
  isSubmitting,
}: VideoFormProps) {
  const router = useRouter();

  const form = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema),
    defaultValues: initialData || {
      platform: VideoPlatform.YOUTUBE, // Default to YOUTUBE for new videos
      videoId: "",
      title: "",
      description: "",
      url: "",
      thumbnailUrl: "",
      categoryId: undefined, // Or 0 if your placeholder requires it
      status: VideoStatus.DRAFT, // Default status
    },
  });

  async function handleSubmit(data: VideoFormData) {
    await onSubmit(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Platform</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a video platform" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(VideoPlatform).map((platformValue) => (
                    <SelectItem key={platformValue} value={platformValue}>
                      {platformValue.charAt(0).toUpperCase() +
                        platformValue.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The platform where the video is hosted (e.g., YouTube, Vimeo).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="videoId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video ID (e.g., YouTube ID)</FormLabel>
              <FormControl>
                <Input placeholder="dQw4w9WgXcQ" {...field} />
              </FormControl>
              <FormDescription>
                The unique identifier for the video (e.g., from YouTube, Vimeo).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="My Awesome Video" {...field} />
              </FormControl>
              <FormDescription>The main title for the video.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The direct URL to the video. Can be auto-generated if empty.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="thumbnailUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.jpg" {...field} />
              </FormControl>
              <FormDescription>
                URL of the video thumbnail image. Can be auto-generated.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a brief description of the video..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A short summary or additional details about the video content.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the category this video belongs to.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(VideoStatus).map((statusValue) => (
                    <SelectItem key={statusValue} value={statusValue}>
                      {statusValue.charAt(0).toUpperCase() +
                        statusValue.slice(1).toLowerCase()}{" "}
                      {/* Prettify enum value */}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Set the status of the video (e.g., Draft, Published).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* More fields will go here */}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : initialData
                ? "Save Changes"
                : "Create Video"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

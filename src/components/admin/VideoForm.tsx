"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Category, VideoStatus, VideoPlatform } from "@generated/prisma"; // Assuming Prisma client is in node_modules
import { useForm } from "react-hook-form";
import { useState } from "react";

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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown } from "lucide-react"; // For the trigger button
import { XIcon } from "lucide-react";

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
    defaultValues: initialData
      ? {
          ...initialData,
          categoryIds: initialData.categoryIds || [], // Ensure categoryIds is an array
          tags: initialData.tags || [], // Initialize tags
        }
      : {
          platform: VideoPlatform.YOUTUBE,
          videoId: "",
          title: "",
          description: "",
          url: "",
          thumbnailUrl: "",
          categoryIds: [], // Initialize with an empty array for new videos
          status: VideoStatus.DRAFT,
          tags: [], // Initialize tags for new videos
        },
  });

  // State for the current tag input value
  const [currentTag, setCurrentTag] = useState("");
  const { control, setValue, watch } = form;

  const existingTags = watch("tags") || [];

  const handleAddTag = () => {
    if (currentTag.trim() && !existingTags.includes(currentTag.trim())) {
      setValue("tags", [...existingTags, currentTag.trim()], {
        shouldValidate: true,
      });
      setCurrentTag(""); // Clear input
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      "tags",
      existingTags.filter((tag) => tag !== tagToRemove),
      { shouldValidate: true },
    );
  };

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
          name="categoryIds" // Changed name to categoryIds
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categories</FormLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {field.value && field.value.length > 0
                        ? field.value.length === 1
                          ? categories.find((cat) => cat.id === field.value[0])
                              ?.name || "1 selected"
                          : `${field.value.length} categories selected`
                        : "Select categories"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  <DropdownMenuLabel>Available Categories</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {categories.map((category) => (
                    <DropdownMenuCheckboxItem
                      key={category.id}
                      checked={field.value?.includes(category.id)}
                      onCheckedChange={(checked) => {
                        const currentCategoryIds = field.value || [];
                        if (checked) {
                          field.onChange([...currentCategoryIds, category.id]);
                        } else {
                          field.onChange(
                            currentCategoryIds.filter(
                              (id) => id !== category.id,
                            ),
                          );
                        }
                      }}
                    >
                      {category.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Display selected category names */}
              {field.value && field.value.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <strong>Selected:</strong>{" "}
                  {field.value
                    .map((id) => categories.find((cat) => cat.id === id)?.name)
                    .filter(Boolean) // Remove any undefined if a selected ID somehow doesn't match
                    .join(", ")}
                </div>
              )}
              <FormDescription>
                Choose one or more categories for this video.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags Field Start */}
        <FormField
          control={control}
          name="tags"
          render={() => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add a tag and press Enter"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={!currentTag.trim()}
                  >
                    Add Tag
                  </Button>
                </div>
              </FormControl>
              {existingTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {existingTags.map((tag, index) => (
                    <span
                      key={index}
                      className="flex items-center justify-center gap-1 pl-2 pr-1 py-1 text-xs bg-secondary text-secondary-foreground rounded-full"
                    >
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0.5 rounded-full hover:bg-destructive/80 hover:text-destructive-foreground"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </span>
                  ))}
                </div>
              )}
              <FormDescription>
                Enter tags one by one. Press Enter or click Add Tag.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Tags Field End */}

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

        {initialData?.transcript && (
          <FormField
            control={form.control}
            name="transcript" // Name matches VideoFormData
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transcript (Read-only)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Video transcript..."
                    className="resize-y min-h-[100px] max-h-[300px] bg-muted/50"
                    {...field}
                    value={initialData.transcript || ""} // Ensure value is passed for read-only
                    readOnly
                  />
                </FormControl>
                <FormDescription>
                  This is the transcript fetched for the video.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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

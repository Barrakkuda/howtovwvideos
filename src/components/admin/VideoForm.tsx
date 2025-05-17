"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Category, VideoStatus, VideoPlatform } from "@generated/prisma";
import { useForm, type Resolver } from "react-hook-form";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import React from "react";

import { videoSchema, VideoFormData } from "@/lib/validators/video";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown } from "lucide-react";
import { XIcon } from "lucide-react";
import {
  getVideoTranscript,
  analyzeVideoWithOpenAI,
  refetchVideoInfo,
  recalculateVideoPopularityScore,
} from "@/app/admin/videos/_actions/videoActions";
import { OpenAIAnalysisResponse } from "@/app/admin/youtube-import/_actions/importActions";

interface VideoFormProps {
  categories: Category[];
  vwTypeOptions: { label: string; value: string }[];
  initialData?: Partial<VideoFormData> & { id?: number };
  dbVideoId?: number;
  onSubmit: (data: VideoFormData) => Promise<void>;
  isSubmitting: boolean;
}

export default function VideoForm({
  categories,
  vwTypeOptions,
  initialData,
  dbVideoId,
  onSubmit,
  isSubmitting,
}: VideoFormProps) {
  const router = useRouter();
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isRefetchingInfo, setIsRefetchingInfo] = useState(false);
  const [openAIAnalysis, setOpenAIAnalysis] = useState<{
    analysis: OpenAIAnalysisResponse | null;
    error: string | null;
  }>({ analysis: null, error: null });
  const [showPublishMessage, setShowPublishMessage] = useState(false);
  const [currentPopularityScore, setCurrentPopularityScore] = useState<
    number | null | undefined
  >(initialData?.popularityScore);
  const [isRecalculatingScore, setIsRecalculatingScore] = useState(false);

  const form = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema) as unknown as Resolver<VideoFormData>,
    defaultValues: initialData
      ? {
          platform: initialData.platform ?? VideoPlatform.YOUTUBE,
          videoId: initialData.videoId ?? "",
          title: initialData.title ?? "",
          description: initialData.description ?? "",
          url: initialData.url ?? "",
          slug: initialData.slug ?? "",
          thumbnailUrl: initialData.thumbnailUrl ?? "",
          channelTitle: initialData.channelTitle ?? "",
          channelUrl: initialData.channelUrl ?? "",
          categoryIds: initialData.categoryIds || [],
          status: initialData.status ?? VideoStatus.DRAFT,
          tags: initialData.tags || [],
          vwTypes: initialData.vwTypes || [],
          transcript: initialData.transcript ?? "",
          popularityScore: initialData.popularityScore ?? undefined,
        }
      : {
          platform: VideoPlatform.YOUTUBE,
          videoId: "",
          title: "",
          description: "",
          url: "",
          slug: "",
          thumbnailUrl: "",
          channelTitle: "",
          channelUrl: "",
          categoryIds: [],
          status: VideoStatus.DRAFT,
          tags: [],
          vwTypes: [],
          transcript: "",
          popularityScore: undefined,
        },
  });

  // State for the current tag input value
  const [currentTag, setCurrentTag] = useState("");
  const { control, setValue, watch } = form;

  const existingTags = watch("tags") || [];

  // Watch for status changes
  const currentStatus = form.watch("status");

  // Update publish message visibility when status changes
  useEffect(() => {
    setShowPublishMessage(currentStatus === VideoStatus.PUBLISHED);
  }, [currentStatus]);

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

  const handleGetTranscript = async () => {
    if (!initialData?.videoId) return;

    setIsTranscriptLoading(true);
    try {
      const result = await getVideoTranscript(initialData.videoId);
      console.log("Received result from getVideoTranscript:", result);

      if (result.success) {
        toast.success(result.message);
        if (typeof result.transcript === "string") {
          form.setValue("transcript", result.transcript, {
            shouldValidate: true,
          });
        } else {
          toast.info(
            `Transcript fetched successfully, but received type: ${typeof result.transcript}`,
          );
        }
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error("Error fetching transcript:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch transcript",
      );
    } finally {
      setIsTranscriptLoading(false);
    }
  };

  const handleAnalyzeWithOpenAI = async () => {
    if (!initialData?.videoId) return;

    // Get transcript from form state
    const transcript = form.watch("transcript");

    // Ensure transcript is available before calling action
    if (
      !transcript ||
      typeof transcript !== "string" ||
      transcript.trim().length === 0
    ) {
      toast.error("Transcript is not available or empty. Cannot analyze.");
      return;
    }

    setIsAnalysisLoading(true);
    setOpenAIAnalysis({ analysis: null, error: null });
    try {
      // Pass videoId and transcript to the action
      const result = await analyzeVideoWithOpenAI(
        initialData.videoId,
        transcript,
      );
      if (result.success) {
        toast.success(result.message);
        if (result.analysis) {
          setOpenAIAnalysis({ analysis: result.analysis, error: null });

          // --- Update form fields with OpenAI suggestions ---
          const {
            categories: suggestedCategories,
            vwTypes: suggestedVwTypes,
            tags: suggestedTags,
          } = result.analysis;

          // Update Categories (Merging)
          if (suggestedCategories && suggestedCategories.length > 0) {
            const matchedCategoryIds = suggestedCategories
              .map(
                (name) =>
                  categories.find(
                    (cat) => cat.name.toLowerCase() === name.toLowerCase(),
                  )?.id,
              )
              .filter((id): id is number => id !== null && id !== undefined); // Type guard
            if (matchedCategoryIds.length > 0) {
              form.setValue(
                "categoryIds",
                Array.from(
                  new Set([
                    ...(form.getValues("categoryIds") || []),
                    ...matchedCategoryIds,
                  ]),
                ),
                { shouldValidate: true },
              );
            }
          }

          // Update VW Types (Merging)
          if (suggestedVwTypes && suggestedVwTypes.length > 0) {
            const matchedVwTypes = suggestedVwTypes
              .map((name) => {
                const formattedName = name.toLowerCase().replace(/\s+|-/g, "_");
                return vwTypeOptions.find((opt) => opt.value === formattedName);
              })
              .filter(
                (opt): opt is { label: string; value: string } =>
                  opt !== null && opt !== undefined,
              ); // Type guard
            if (matchedVwTypes.length > 0) {
              form.setValue(
                "vwTypes",
                Array.from(
                  new Set([
                    ...(form.getValues("vwTypes") || []),
                    ...matchedVwTypes.map((opt) => opt.value),
                  ]),
                ),
                { shouldValidate: true },
              );
            }
          }

          // Update Tags (Merging)
          if (suggestedTags && suggestedTags.length > 0) {
            const currentTags = form.getValues("tags") || [];
            form.setValue(
              "tags",
              Array.from(new Set([...currentTags, ...suggestedTags])),
              { shouldValidate: true },
            );
          }
          // --- End of form field update ---
        }
      } else {
        toast.error(result.message);
        setOpenAIAnalysis({ analysis: null, error: result.message });
      }
    } catch (err) {
      console.error("Error analyzing video:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to analyze video";
      toast.error(errorMessage);
      setOpenAIAnalysis({ analysis: null, error: errorMessage });
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleRefetchVideoInfo = async () => {
    if (!initialData?.videoId) return;

    setIsRefetchingInfo(true);
    try {
      const result = await refetchVideoInfo(initialData.videoId);
      if (result.success && result.data) {
        // Update form fields with the fetched data
        const { title, description, thumbnailUrl } = result.data;

        // Ensure we have valid string values for required fields
        if (typeof title === "string") {
          form.setValue("title", title);
        }

        // Handle optional fields
        if (typeof description === "string") {
          form.setValue("description", description);
        } else {
          form.setValue("description", undefined);
        }

        // Set the video URL
        form.setValue(
          "url",
          `https://www.youtube.com/watch?v=${initialData.videoId}`,
        );

        // Handle optional thumbnail URL
        if (typeof thumbnailUrl === "string") {
          form.setValue("thumbnailUrl", thumbnailUrl);
        } else {
          form.setValue("thumbnailUrl", undefined);
        }

        // Note: We don't update platform or videoId as those shouldn't change

        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error("Error refetching video info:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to refetch video information",
      );
    } finally {
      setIsRefetchingInfo(false);
    }
  };

  const handleRecalculateScore = async () => {
    const videoIdToUse = dbVideoId ?? initialData?.id;
    if (!videoIdToUse) {
      toast.error("Video ID is not available. Cannot recalculate score.");
      return;
    }
    setIsRecalculatingScore(true);
    try {
      const result = await recalculateVideoPopularityScore(videoIdToUse);
      if (result.success) {
        toast.success(result.message);
        setCurrentPopularityScore(result.newScore);
        // Optionally update form value if you want it to be part of the form state for some reason
        // form.setValue("popularityScore", result.newScore, { shouldValidate: true });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(
        "An unexpected error occurred while recalculating the score.",
      );
      console.error("Recalculate score error:", error);
    }
    setIsRecalculatingScore(false);
  };

  async function handleSubmit(data: VideoFormData) {
    await onSubmit(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="videoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Video ID (e.g., YouTube ID)</FormLabel>
                <FormControl>
                  <Input placeholder="dQw4w9WgXcQ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Platform</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="My Awesome Video" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="my-awesome-video" disabled {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Input
                    placeholder="https://example.com/image.jpg"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="channelTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Channel Title (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Channel Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="channelUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Channel URL (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://www.youtube.com/channel/..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vwTypes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VW Types</FormLabel>
                <FormControl>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {((): string => {
                          if (!field.value || field.value.length === 0) {
                            return "Select VW Types";
                          }
                          if (field.value.length === 1) {
                            const selectedValue = field.value[0];
                            return (
                              vwTypeOptions.find(
                                (opt) => opt.value === selectedValue,
                              )?.label || selectedValue
                            );
                          }
                          return `${field.value.length} VW Types selected`;
                        })()}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                      <DropdownMenuLabel>Available VW Types</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {vwTypeOptions.map((option) => (
                        <DropdownMenuCheckboxItem
                          key={option.value}
                          checked={field.value?.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || [];
                            if (checked) {
                              field.onChange([...currentValues, option.value]);
                            } else {
                              field.onChange(
                                currentValues.filter((v) => v !== option.value),
                              );
                            }
                          }}
                        >
                          {option.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </FormControl>
                {field.value && field.value.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <strong>Selected:</strong>{" "}
                    {field.value
                      .map(
                        (val) =>
                          vwTypeOptions.find((opt) => opt.value === val)?.label,
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryIds"
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
                            ? categories.find(
                                (cat) => cat.id === field.value[0],
                              )?.name || "1 selected"
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
                            field.onChange([
                              ...currentCategoryIds,
                              category.id,
                            ]);
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
                {field.value && field.value.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <strong>Selected:</strong>{" "}
                    {field.value
                      .map(
                        (id) => categories.find((cat) => cat.id === id)?.name,
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showPublishMessage && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400">
                  Note: Setting status to Published will mark this video as a
                  How-To VW video.
                </span>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {initialData?.status === VideoStatus.REJECTED && (
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefetchVideoInfo}
              disabled={isRefetchingInfo || isSubmitting}
            >
              {isRefetchingInfo ? "Refetching..." : "Refetch Video Info"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGetTranscript}
              disabled={isTranscriptLoading || isSubmitting}
            >
              {isTranscriptLoading ? "Getting Transcript..." : "Get Transcript"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleAnalyzeWithOpenAI}
              disabled={
                isAnalysisLoading || isSubmitting || !watch("transcript")
              }
            >
              {isAnalysisLoading ? "Analyzing..." : "Prompt OpenAI"}
            </Button>
          </div>
        )}

        {watch("transcript") && (
          <>
            <FormField
              control={form.control}
              name="transcript"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transcript</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Video transcript..."
                      className="resize-y min-h-[100px] max-h-[300px] bg-muted/50"
                      {...field}
                      readOnly
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {openAIAnalysis.analysis && (
              <div className="mt-4 p-4 bg-sky-100 dark:bg-sky-900/50 rounded-lg">
                <h4 className="font-semibold text-sky-700 dark:text-sky-300 mb-2">
                  OpenAI Analysis:
                </h4>
                <div className="space-y-2">
                  {openAIAnalysis.analysis.isHowToVWVideo !== undefined && (
                    <p className="text-sm">
                      <span className="font-medium">Is How-To VW Video:</span>{" "}
                      {openAIAnalysis.analysis.isHowToVWVideo ? "Yes" : "No"}
                    </p>
                  )}
                  {openAIAnalysis.analysis.categories &&
                    openAIAnalysis.analysis.categories.length > 0 && (
                      <div>
                        <p className="font-medium text-sm">
                          Suggested Categories:
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {openAIAnalysis.analysis.categories.map(
                            (category, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-sky-200 dark:bg-sky-800 text-sky-700 dark:text-sky-300 rounded-full"
                              >
                                {category}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  {openAIAnalysis.analysis.vwTypes &&
                    openAIAnalysis.analysis.vwTypes.length > 0 && (
                      <div>
                        <p className="font-medium text-sm">
                          Suggested VW Types:
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {openAIAnalysis.analysis.vwTypes.map(
                            (type, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-sky-200 dark:bg-sky-800 text-sky-700 dark:text-sky-300 rounded-full"
                              >
                                {type}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  {openAIAnalysis.analysis.tags &&
                    openAIAnalysis.analysis.tags.length > 0 && (
                      <div>
                        <p className="font-medium text-sm">Suggested Tags:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {openAIAnalysis.analysis.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-sky-200 dark:bg-sky-800 text-sky-700 dark:text-sky-300 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {openAIAnalysis.error && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                <p className="text-sm font-medium">OpenAI Analysis Error:</p>
                <p className="text-sm mt-1">{openAIAnalysis.error}</p>
              </div>
            )}
          </>
        )}

        {/* Popularity Score Display and Recalculate Button */}
        {(dbVideoId || initialData?.id) && ( // Only show if editing an existing video
          <div className="space-y-2">
            <FormLabel>Popularity Score</FormLabel>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={
                  currentPopularityScore !== null &&
                  currentPopularityScore !== undefined
                    ? currentPopularityScore.toFixed(2)
                    : ""
                }
                readOnly
                className="w-24 bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleRecalculateScore}
                disabled={isRecalculatingScore || isSubmitting}
              >
                {isRecalculatingScore ? "Recalculating..." : "Recalculate"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Current score. Click to recalculate based on latest YouTube stats.
            </p>
          </div>
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

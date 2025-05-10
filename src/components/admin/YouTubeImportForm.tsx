"use client";

import { useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, SearchIcon, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Category } from "@generated/prisma";

import {
  searchYouTubeVideos,
  importYouTubeVideo,
  YouTubeVideoItem,
  ImportVideoResponse,
} from "@/app/admin/youtube-import/_actions/youtubeActions";

interface YouTubeImportFormProps {
  categories: Category[];
}

export default function YouTubeImportForm({
  categories,
}: YouTubeImportFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<YouTubeVideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for import status: videoId -> { importing: boolean, imported: boolean, success?: boolean, message?: string }
  type ImportStatus = Record<
    string,
    {
      importing: boolean;
      imported: boolean;
      success?: boolean;
      message?: string;
    }
  >;
  const [importStatus, setImportStatus] = useState<ImportStatus>({});
  const [selectedCategories, setSelectedCategories] = useState<
    Record<string, string>
  >({}); // videoId -> categoryId string

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      setError("Please enter a search query.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults([]); // Clear previous results
    setImportStatus({}); // Clear import statuses
    setSelectedCategories({}); // Clear selected categories

    try {
      const searchResults = await searchYouTubeVideos(searchQuery);
      if (!searchResults.success) {
        setError(searchResults.error || "An unknown error occurred.");
        if (searchResults.quotaExceeded) {
          toast.error("YouTube API quota exceeded. Please try again later.");
        }
        setResults([]);
      } else {
        setResults(searchResults.data || []);
        if ((searchResults.data || []).length === 0) {
          // setError will be handled by the generic "No results found" message below
        }
      }
    } catch (err) {
      console.error("Search failed:", err);
      setError("Failed to search videos. Please try again.");
      setResults([]);
    }
    setIsLoading(false);
  };

  const handleImport = async (video: YouTubeVideoItem) => {
    const categoryIdStr = selectedCategories[video.id];
    if (!categoryIdStr) {
      toast.error("Please select a category for this video.");
      setImportStatus((prev) => ({
        ...prev,
        [video.id]: {
          importing: false,
          imported: false,
          message: "Please select a category.",
        },
      }));
      return;
    }
    const categoryId = parseInt(categoryIdStr, 10);

    setImportStatus((prev) => ({
      ...prev,
      [video.id]: { importing: true, imported: false, success: false },
    }));

    try {
      const response: ImportVideoResponse = await importYouTubeVideo(
        video,
        categoryId,
      );
      if (response.success) {
        toast.success(response.message);
        setImportStatus((prev) => ({
          ...prev,
          [video.id]: {
            importing: false,
            imported: true,
            success: true,
            message: response.message,
          },
        }));
      } else {
        toast.error(response.message);
        setImportStatus((prev) => ({
          ...prev,
          [video.id]: {
            importing: false,
            imported: false,
            success: false,
            message: response.message,
          },
        }));
      }
    } catch (err) {
      console.error("Import failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(`Failed to import video: ${errorMessage}`);
      setImportStatus((prev) => ({
        ...prev,
        [video.id]: {
          importing: false,
          imported: false,
          success: false,
          message: `Import failed: ${errorMessage}`,
        },
      }));
    }
  };

  const handleCategoryChange = (videoId: string, categoryId: string) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [videoId]: categoryId,
    }));
    // Clear message if user selects a category after an error
    if (importStatus[videoId]?.message === "Please select a category.") {
      setImportStatus((prev) => ({
        ...prev,
        [videoId]: { ...prev[videoId], message: undefined },
      }));
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <Input
          type="search"
          placeholder="Search YouTube for videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !searchQuery.trim()}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="mr-2 h-4 w-4" />
          )}
          Search
        </Button>
      </form>

      {error && <p className="text-destructive">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Results</h2>
          <ul className="space-y-3">
            {results.map((video) => {
              const status = importStatus[video.id] || {
                importing: false,
                imported: false,
              };
              return (
                <li
                  key={video.id}
                  className="flex flex-col sm:flex-row items-start gap-4 p-3 border rounded-md bg-card"
                >
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    width={120}
                    height={90}
                    className="w-full sm:w-32 rounded-sm object-cover aspect-video sm:aspect-auto"
                  />
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-card-foreground">
                      {video.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {video.description || "No description."}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                      <Select
                        onValueChange={(value) =>
                          handleCategoryChange(video.id, value)
                        }
                        value={selectedCategories[video.id] || ""}
                        disabled={status.importing || status.imported}
                      >
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.length === 0 ? (
                            <SelectItem value="" disabled>
                              No categories found
                            </SelectItem>
                          ) : (
                            categories.map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImport(video)}
                        disabled={
                          status.importing ||
                          status.imported ||
                          categories.length === 0
                        }
                        className="w-full sm:w-auto"
                      >
                        {status.importing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : status.imported ? (
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        ) : null}
                        {status.importing
                          ? "Importing..."
                          : status.imported
                            ? "Imported"
                            : "Import"}
                      </Button>
                    </div>
                    {status.message && (
                      <p
                        className={`text-xs mt-1 ${status.success ? "text-green-600" : "text-destructive"}`}
                      >
                        {status.message}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {!isLoading && !error && results.length === 0 && searchQuery && (
        <p className="text-muted-foreground">
          No results found for &quot;{searchQuery}&quot;. Searched videos will
          appear here.
        </p>
      )}
      {!isLoading && !error && results.length === 0 && !searchQuery && (
        <p className="text-muted-foreground">
          Enter a search term to find YouTube videos.
        </p>
      )}
    </div>
  );
}

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
  getYouTubeTranscript,
  analyzeTranscriptWithOpenAI,
  YouTubeVideoItem,
  ImportVideoResponse,
  OpenAIAnalysisResponse,
  ImportYouTubeVideoPayload,
} from "@/app/admin/youtube-import/_actions/importActions";

const AUTO_GENERATED_CATEGORY_VALUE = "auto-generated-openai";

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

  // State for transcript display: videoId -> { fetching: boolean, transcript: string | null, error: string | null }
  type DisplayedTranscriptStatus = Record<
    string,
    { fetching: boolean; transcript: string | null; error: string | null }
  >;
  const [displayedTranscripts, setDisplayedTranscripts] =
    useState<DisplayedTranscriptStatus>({});

  // State for OpenAI analysis: videoId -> { fetching: boolean, analysis: OpenAIAnalysisResponse | null, error: string | null }
  type OpenAIAnalysisStatus = Record<
    string,
    {
      fetching: boolean;
      analysis: OpenAIAnalysisResponse | null;
      error: string | null;
    }
  >;
  const [openaiAnalysis, setOpenaiAnalysis] = useState<OpenAIAnalysisStatus>(
    {},
  );

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
    setDisplayedTranscripts({}); // Clear displayed transcripts
    setOpenaiAnalysis({}); // Clear OpenAI analysis results

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
    const selectedCategoryOption = selectedCategories[video.id];
    let importPayload: ImportYouTubeVideoPayload;

    if (!selectedCategoryOption) {
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

    if (selectedCategoryOption === AUTO_GENERATED_CATEGORY_VALUE) {
      const analysis = openaiAnalysis[video.id]?.analysis;
      if (
        !analysis ||
        !analysis.categories ||
        analysis.categories.length === 0
      ) {
        toast.error(
          "OpenAI did not suggest any categories, or analysis is not available. Please select a category manually.",
        );
        setImportStatus((prev) => ({
          ...prev,
          [video.id]: {
            importing: false,
            imported: false,
            message: "OpenAI categories missing.",
          },
        }));
        return;
      }
      importPayload = {
        videoData: video,
        categories: analysis.categories,
      };
    } else {
      const categoryId = parseInt(selectedCategoryOption, 10);
      if (isNaN(categoryId)) {
        toast.error("Invalid category selected.");
        return; // Should not happen if UI is correct
      }
      importPayload = { videoData: video, categoryId: categoryId };
    }

    setImportStatus((prev) => ({
      ...prev,
      [video.id]: { importing: true, imported: false, success: false },
    }));

    try {
      const response: ImportVideoResponse =
        await importYouTubeVideo(importPayload);
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

  const handleFetchTranscript = async (videoId: string) => {
    setDisplayedTranscripts((prev) => ({
      ...prev,
      [videoId]: { fetching: true, transcript: null, error: null },
    }));
    try {
      const result = await getYouTubeTranscript(videoId);
      if (result.success) {
        setDisplayedTranscripts((prev) => ({
          ...prev,
          [videoId]: {
            fetching: false,
            transcript: result.transcript ?? null,
            error: result.transcript
              ? null
              : result.error || "Transcript not available.",
          },
        }));
        if (!result.transcript && result.error) {
          toast.error(result.error);
        } else if (!result.transcript) {
          toast.info("Transcript not available for this video.");
        }
      } else {
        setDisplayedTranscripts((prev) => ({
          ...prev,
          [videoId]: {
            fetching: false,
            transcript: null,
            error: result.error || "Failed to fetch transcript.",
          },
        }));
        toast.error(result.error || "Failed to fetch transcript.");
      }
    } catch (err) {
      console.error("Fetch transcript failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setDisplayedTranscripts((prev) => ({
        ...prev,
        [videoId]: { fetching: false, transcript: null, error: errorMessage },
      }));
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const handleOpenAIAnalysis = async (videoId: string) => {
    const transcriptData = displayedTranscripts[videoId];
    if (!transcriptData?.transcript) {
      toast.error("Please fetch the transcript first.");
      return;
    }

    setOpenaiAnalysis((prev) => ({
      ...prev,
      [videoId]: { fetching: true, analysis: null, error: null },
    }));

    try {
      const result = await analyzeTranscriptWithOpenAI(
        transcriptData.transcript,
      );
      if (result.success) {
        setOpenaiAnalysis((prev) => ({
          ...prev,
          [videoId]: {
            fetching: false,
            analysis: result.data ?? null,
            error: result.data
              ? null
              : result.error || "Analysis data not available.",
          },
        }));
        if (result.data) {
          toast.success("Transcript analyzed successfully by OpenAI.");
          // Auto-select 'Auto Generated (OpenAI)' if categories are suggested
          if (result.data.categories && result.data.categories.length > 0) {
            setSelectedCategories((prev) => ({
              ...prev,
              [videoId]: AUTO_GENERATED_CATEGORY_VALUE,
            }));
          }
        } else if (result.error) {
          toast.error(result.error);
        } else {
          toast.info("OpenAI analysis did not return data.");
        }
      } else {
        setOpenaiAnalysis((prev) => ({
          ...prev,
          [videoId]: {
            fetching: false,
            analysis: null,
            error: result.error || "Failed to analyze transcript with OpenAI.",
          },
        }));
        toast.error(
          result.error || "Failed to analyze transcript with OpenAI.",
        );
      }
    } catch (err) {
      console.error("OpenAI analysis failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setOpenaiAnalysis((prev) => ({
        ...prev,
        [videoId]: { fetching: false, analysis: null, error: errorMessage },
      }));
      toast.error(`OpenAI Error: ${errorMessage}`);
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
              const transcriptStatus = displayedTranscripts[video.id];
              const analysisStatus = openaiAnalysis[video.id];

              const importingOrImported = status.importing || status.imported;

              const openAIAnalysisBlocksImport =
                analysisStatus?.analysis &&
                analysisStatus.analysis.isHowToVWVideo === false;

              const hasOpenAISuggestions =
                analysisStatus?.analysis?.categories &&
                analysisStatus.analysis.categories.length > 0;

              const isManualCategoryDirectlySelected =
                selectedCategories[video.id] &&
                selectedCategories[video.id] !== AUTO_GENERATED_CATEGORY_VALUE;

              const canImportViaAutoGenerated =
                selectedCategories[video.id] ===
                  AUTO_GENERATED_CATEGORY_VALUE &&
                analysisStatus?.analysis?.isHowToVWVideo === true &&
                hasOpenAISuggestions;

              const hasValidCategorySelectionForImport =
                isManualCategoryDirectlySelected || canImportViaAutoGenerated;

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
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFetchTranscript(video.id)}
                        disabled={transcriptStatus?.fetching || status.imported}
                        className="w-full sm:w-auto"
                      >
                        {transcriptStatus?.fetching ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Get Transcript
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAIAnalysis(video.id)}
                        disabled={
                          !transcriptStatus?.transcript ||
                          analysisStatus?.fetching ||
                          status.imported
                        }
                        className="w-full sm:w-auto"
                        title={
                          !transcriptStatus?.transcript
                            ? "Fetch transcript first"
                            : "Analyze with OpenAI"
                        }
                      >
                        Prompt OpenAI
                      </Button>
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
                          {hasOpenAISuggestions && (
                            <SelectItem value={AUTO_GENERATED_CATEGORY_VALUE}>
                              Auto Generated (OpenAI)
                            </SelectItem>
                          )}
                          {categories.length === 0 && !hasOpenAISuggestions ? (
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
                          importingOrImported ||
                          openAIAnalysisBlocksImport ||
                          !hasValidCategorySelectionForImport
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
                    {transcriptStatus && (
                      <div className="mt-2 text-xs">
                        {transcriptStatus.fetching && (
                          <p className="text-muted-foreground">
                            Fetching transcript...
                          </p>
                        )}
                        {transcriptStatus.error && (
                          <p className="text-destructive">
                            Error: {transcriptStatus.error}
                          </p>
                        )}
                        {transcriptStatus.transcript && (
                          <details>
                            <summary className="cursor-pointer">
                              View Transcript
                            </summary>
                            <p className="mt-1 p-2 bg-muted/50 rounded text-muted-foreground max-h-32 overflow-y-auto">
                              {transcriptStatus.transcript}
                            </p>
                          </details>
                        )}
                      </div>
                    )}
                    {analysisStatus && (
                      <div className="mt-2 text-xs">
                        {analysisStatus.fetching && (
                          <p className="text-muted-foreground">
                            Analyzing with OpenAI...
                          </p>
                        )}
                        {analysisStatus.error && (
                          <p className="text-destructive">
                            OpenAI Error: {analysisStatus.error}
                          </p>
                        )}
                        {analysisStatus.analysis && (
                          <div className="mt-1 p-2 bg-sky-100 dark:bg-sky-900/50 rounded">
                            <h4 className="font-semibold text-sky-700 dark:text-sky-300">
                              OpenAI Analysis:
                            </h4>
                            <pre className="text-xs text-sky-600 dark:text-sky-400 whitespace-pre-wrap">
                              {JSON.stringify(analysisStatus.analysis, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
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

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, PlayIcon } from "lucide-react";
import { toast } from "sonner";

export interface BatchActionResult {
  videoId: string;
  success: boolean;
  message: string;
  error?: string;
}

export default function BatchImportSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchActionResult[]>([]);

  const handleBatchImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query for the batch.");
      return;
    }

    setIsProcessing(true);
    setBatchResults([]); // Clear previous results

    try {
      // Dynamically import the action
      const { batchImportYouTubeVideosAction } = await import(
        "@/app/admin/youtube-import/_actions/importActions"
      );

      const results = await batchImportYouTubeVideosAction(searchQuery);
      setBatchResults(results);

      const generalActionError = results.find(
        (r) => !r.success && r.videoId === "batch-action-error",
      );

      if (generalActionError) {
        toast.error(
          generalActionError.message || "Batch import action failed.",
        );
      } else if (results.length > 0 && results.every((r) => r.success)) {
        toast.success(
          "Batch import completed successfully. See results below.",
        );
      } else if (results.length > 0) {
        toast.warning(
          "Batch import finished with some errors. See results below.",
        );
      } else {
        // This case might occur if search yields 0 videos initially
        toast.info(
          "Batch process ran, but no videos were processed (e.g., no new videos found or search yielded no results).",
        );
      }
    } catch (error) {
      console.error("Client-side error calling batch import action:", error);
      toast.error("Failed to trigger batch import. Check console for details.");
      setBatchResults([
        {
          videoId: "client-error",
          success: false,
          message: "Client error during batch import initiation.",
          error:
            error instanceof Error ? error.message : "Unknown client error",
        },
      ]);
    }

    setIsProcessing(false);
  };

  return (
    <div className="mb-12 p-6 border rounded-lg shadow-sm bg-card">
      <h2 className="text-xl font-semibold mb-4 text-card-foreground">
        Batch Video Import
      </h2>
      <form onSubmit={handleBatchImport} className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-grow">
            <Input
              id="batchSearchQuery"
              type="search"
              placeholder="Search term"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              disabled={isProcessing}
            />
          </div>
          <Button
            type="submit"
            disabled={isProcessing || !searchQuery.trim()}
            className="shrink-0"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayIcon className="mr-2 h-4 w-4" />
            )}
            Run Import
          </Button>
        </div>
      </form>

      {isProcessing && (
        <div className="mt-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">
            Batch import in progress... This may take a while.
          </p>
          {/* More detailed progress can be added here if the action streams it */}
        </div>
      )}

      {batchResults.length > 0 && !isProcessing && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Batch Import Results:</h3>
          <ul className="space-y-2 max-h-96 overflow-y-auto p-3 bg-muted/50 rounded">
            {batchResults.map((result, index) => (
              <li
                key={index}
                className={`text-sm p-2 rounded ${result.success ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"}`}
              >
                <strong>Video ID: {result.videoId}</strong> - {result.message}
                {result.error && (
                  <span className="block text-xs">Error: {result.error}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

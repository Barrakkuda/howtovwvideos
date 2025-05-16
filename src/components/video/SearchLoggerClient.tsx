"use client";

import { useEffect } from "react";
import { logSearch } from "@/app/_actions/loggingActions";

interface SearchLoggerClientProps {
  searchQuery?: string;
  totalVideos: number;
}

export function SearchLoggerClient({
  searchQuery,
  totalVideos,
}: SearchLoggerClientProps) {
  useEffect(() => {
    if (searchQuery && searchQuery.trim() !== "") {
      const submittedTerm = sessionStorage.getItem("search_submission_term");
      if (submittedTerm === searchQuery) {
        // console.log(`[SearchLoggerClient] Condition met. Logging search for: ${searchQuery}, count: ${totalVideos}`);
        logSearch(searchQuery, totalVideos)
          .then(() => {
            // console.log(`[SearchLoggerClient] Logged: ${searchQuery}`);
            // Clear the flag only after successful logging for this specific term.
            sessionStorage.removeItem("search_submission_term");
          })
          .catch((error) => {
            console.error(`[SearchLoggerClient] Error logging search:`, error);
            // Optionally, you might want to decide if removeItem should still happen on error
            // or if a retry mechanism for logging could be considered (more complex).
            // For now, we only remove on success.
          });
      }
    }
  }, [searchQuery, totalVideos]); // Effect dependencies

  return null; // This component does not render any UI
}

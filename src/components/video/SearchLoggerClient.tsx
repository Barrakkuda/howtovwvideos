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
        logSearch(searchQuery, totalVideos)
          .then(() => {
            sessionStorage.removeItem("search_submission_term");
          })
          .catch(() => {
            sessionStorage.removeItem("search_submission_term");
          });
      }
    }
  }, [searchQuery, totalVideos]);

  return null;
}

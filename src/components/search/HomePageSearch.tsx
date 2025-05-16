"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MIN_SEARCH_LENGTH = 3;

export default function HomePageSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedQuery = searchQuery.trim();

      if (!trimmedQuery) {
        // Optionally, you could show a toast or do nothing if the query is empty
        // For now, we'll just prevent submission of an empty query silently.
        return;
      }

      if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
        toast.warning(
          `Please enter at least ${MIN_SEARCH_LENGTH} characters to search.`,
        );
        return;
      }

      // Set the flag in sessionStorage before navigating (consistent with SearchBar.tsx)
      sessionStorage.setItem("search_submission_term", trimmedQuery);

      const searchPageParams = new URLSearchParams();
      searchPageParams.set("q", trimmedQuery);
      router.push(`/search?${searchPageParams.toString()}`);
    },
    [searchQuery, router],
  );

  return (
    <div className="mb-8 flex justify-center">
      <form
        onSubmit={handleSearchSubmit}
        className="flex w-full max-w-lg items-center space-x-2 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg shadow-md"
      >
        <Input
          type="search"
          placeholder="Search for how-to videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 border-neutral-300 dark:border-neutral-600"
          aria-label="Search videos"
        />
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <SearchIcon className="mr-2 h-5 w-5" />
          Search
        </Button>
      </form>
    </div>
  );
}

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
        return;
      }

      if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
        toast.warning(
          `Please enter at least ${MIN_SEARCH_LENGTH} characters to search.`,
        );
        return;
      }

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
        className="flex w-full items-center space-x-2"
      >
        <Input
          type="search"
          placeholder="Search for how-to videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-16 flex-grow bg-white dark:bg-black/50 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-white/60 md:text-xl placeholder:text-xl focus:ring-2 focus:ring-white focus-visible:ring-2 focus-visible:ring-white/40 border-neutral-300 dark:border-white/30"
          aria-label="Search videos"
        />
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="text-xl bg-blue-600 hover:bg-blue-700 text-white h-16"
        >
          <SearchIcon className="mr-2 h-5 w-5" />
          Search
        </Button>
      </form>
    </div>
  );
}

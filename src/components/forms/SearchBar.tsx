"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MIN_SEARCH_LENGTH = 3;

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    currentSearchParams.get("q") || "",
  );

  useEffect(() => {
    setSearchQuery(currentSearchParams.get("q") || "");
  }, [currentSearchParams]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearchQuery(newValue);

      if (newValue === "") {
        if (pathname === "/search") {
          router.push("/");
        } else {
          const newParams = new URLSearchParams(currentSearchParams.toString());
          newParams.delete("q");
          router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
        }
      }
    },
    [router, pathname, currentSearchParams],
  );

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedQuery = searchQuery.trim();

      if (!trimmedQuery) {
        if (pathname === "/search") {
          router.push("/");
        } else {
          const newParams = new URLSearchParams(currentSearchParams.toString());
          if (newParams.has("q")) {
            newParams.delete("q");
            router.push(`${pathname}?${newParams.toString()}`, {
              scroll: false,
            });
          }
        }
        return;
      }

      if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
        toast.warning(
          `Please enter at least ${MIN_SEARCH_LENGTH} characters to search.`,
        );
        return;
      }

      const searchPageParams = new URLSearchParams();
      searchPageParams.set("q", trimmedQuery);

      // Set the flag in sessionStorage before navigating
      sessionStorage.setItem("search_submission_term", trimmedQuery);

      router.push(`/search?${searchPageParams.toString()}`);
    },
    [searchQuery, router, pathname, currentSearchParams],
  );

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="flex w-full max-w-sm items-center space-x-2"
    >
      <div className="relative flex-1">
        <Input
          type="search"
          placeholder="Search videos..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="bg-neutral-700 text-white placeholder-neutral-400 focus:bg-neutral-600 border-neutral-600 focus-visible:ring-blue-500 focus-visible:ring-offset-neutral-800"
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        size="icon"
        className="border-neutral-600 hover:bg-neutral-700 hover:text-blue-400"
      >
        <Search className="h-4 w-4" />
        <span className="sr-only">Search</span>
      </Button>
    </form>
  );
}

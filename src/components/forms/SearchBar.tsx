"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // To navigate to search results page
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    // Navigate to a search results page, e.g., /search?q=query
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="flex w-full max-w-sm items-center space-x-2"
    >
      <Input
        type="search"
        placeholder="Search videos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-neutral-700 text-white placeholder-neutral-400 focus:bg-neutral-600 border-neutral-600 focus-visible:ring-blue-500 focus-visible:ring-offset-neutral-800"
      />
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

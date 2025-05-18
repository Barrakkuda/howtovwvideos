"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  basePath?: string;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  basePath = "/",
}: PaginationControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;

    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("page", page.toString());
    const query = current.toString();
    const path = `${basePath}${query ? `?${query}` : ""}`;
    router.push(path);
  };

  if (totalPages <= 1) {
    return null; // Don't render pagination if there's only one page or less
  }

  return (
    <div className="flex items-center justify-center space-x-2 sm:space-x-4 my-8">
      <Button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!hasPrevPage}
        variant="outline"
        size="sm"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
        Previous
      </Button>

      <span className="text-sm text-neutral-600 dark:text-neutral-400">
        Page {currentPage} of {totalPages}
      </span>

      <Button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!hasNextPage}
        variant="outline"
        size="sm"
        aria-label="Go to next page"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
      </Button>
    </div>
  );
}

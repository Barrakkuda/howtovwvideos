"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { columns, VideoEntry } from "./columns";
import { DataTable, DataTableFilterField } from "@/components/ui/data-table";
import { fetchVideosForTable } from "./_actions/videoTableActions";
import { toast } from "sonner";
import { Category, VideoStatus } from "@generated/prisma";
import { fetchAllCategories } from "../categories/_actions/categoryActions";
import { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";

// Helper to format VideoStatus enum for display
const formatVideoStatus = (status: VideoStatus): string => {
  switch (status) {
    case VideoStatus.DRAFT:
      return "Draft";
    case VideoStatus.PUBLISHED:
      return "Published";
    case VideoStatus.ARCHIVED:
      return "Archived";
    case VideoStatus.REJECTED:
      return "Rejected";
    default:
      const exhaustiveCheck: never = status;
      console.warn(`Unknown VideoStatus encountered: ${exhaustiveCheck}`);
      return status;
  }
};

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const initialVideoTableFilters: ColumnFiltersState = useMemo(() => {
    return [
      {
        id: "status",
        value: [VideoStatus.DRAFT, VideoStatus.PUBLISHED],
      },
    ];
  }, []);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const videosData = await fetchVideosForTable();
        if (videosData.success && videosData.data) {
          setVideos(videosData.data as VideoEntry[]);
        } else {
          setError(videosData.error || "Failed to fetch videos.");
          toast.error(videosData.error || "Failed to fetch videos.");
        }

        const categoriesData = await fetchAllCategories();
        if (categoriesData.success && categoriesData.data) {
          setAllCategories(categoriesData.data);
        } else {
          setError(
            (prevError) =>
              (prevError ? prevError + ": " : "") +
              (categoriesData.error || "Failed to fetch categories."),
          );
          toast.error(categoriesData.error || "Failed to fetch categories.");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(errorMessage);
        toast.error(`Error loading data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const facetFilters = useMemo((): DataTableFilterField<VideoEntry>[] => {
    const statusOptions = Object.values(VideoStatus).map((status) => ({
      label: formatVideoStatus(status),
      value: status,
    }));

    const categoryOptions = allCategories.map((cat) => ({
      label: cat.name,
      value: cat.id.toString(),
    }));

    return [
      {
        columnId: "status",
        title: "Status",
        options: statusOptions,
      },
      {
        columnId: "categories",
        title: "Category",
        options: categoryOptions,
      },
    ];
  }, [allCategories]);

  if (isLoading) {
    return <p className="text-center py-10">Loading videos...</p>;
  }

  if (error) {
    return (
      <p className="text-center text-red-500 py-10">
        Error loading videos: {error}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Videos</h1>
        <Button asChild>
          <Link href="/admin/videos/new">
            <PlusIcon className="mr-2 h-4 w-4" /> Add Video
          </Link>
        </Button>
      </div>

      <DataTable<VideoEntry, unknown>
        columns={columns as ColumnDef<VideoEntry, unknown>[]}
        data={videos}
        filterColumnId="title"
        filterColumnPlaceholder="Filter by title..."
        facetFilters={facetFilters}
        initialColumnFilters={initialVideoTableFilters}
      />
    </>
  );
}

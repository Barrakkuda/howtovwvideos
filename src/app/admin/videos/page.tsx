"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { columns } from "./columns";
import { DataTable, DataTableFilterField } from "@/components/ui/dataTable";
import {
  fetchVideosForTable,
  VideoForTable,
} from "./_actions/videoTableActions";
import { toast } from "sonner";
import { Category, VideoStatus, VWType } from "@generated/prisma";
import { fetchAllCategories } from "../categories/_actions/categoryActions";
import { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { formatVideoStatus } from "@/lib/utils/formatters";

// Helper to format VWType enum for display
const formatVWType = (type: VWType): string => {
  return String(type)
    .toLowerCase()
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoForTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const searchParams = useSearchParams();

  const tableKey = useMemo(() => {
    const sortField = searchParams.get("sort_field") || "";
    const sortDir = searchParams.get("sort_dir") || "";
    const filterKeys = Array.from(searchParams.keys())
      .filter((key) => key.startsWith("filter_"))
      .sort();
    const filterValues = filterKeys
      .map((key) => `${key}=${searchParams.get(key)}`)
      .join("&");
    return `sort=${sortField}:${sortDir}&filters=${filterValues}`;
  }, [searchParams]);

  // Re-add the definition for the initial filters
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
          setVideos(videosData.data);
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

  const facetFilters = useMemo((): DataTableFilterField<VideoForTable>[] => {
    const statusOptions = Object.values(VideoStatus).map((status) => ({
      label: formatVideoStatus(status),
      value: status,
    }));

    const categoryOptions = allCategories.map((cat) => ({
      label: cat.name,
      value: cat.id.toString(),
    }));

    const vwTypeOptions = Object.values(VWType).map((type) => ({
      label: formatVWType(type),
      value: type,
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
      {
        columnId: "vwTypes",
        title: "VW Type",
        options: vwTypeOptions,
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

  // console.log("AdminVideosPage: videos data before passing to DataTable:", videos);
  // console.log("AdminVideosPage: videos count:", videos.length);

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

      <DataTable<VideoForTable, unknown>
        key={tableKey}
        localStorageKey="adminVideosTableState"
        columns={columns as ColumnDef<VideoForTable, unknown>[]}
        data={videos}
        filterColumnPlaceholder="Search in title and video ID..."
        facetFilters={facetFilters}
        initialColumnFilters={initialVideoTableFilters}
      />
    </>
  );
}

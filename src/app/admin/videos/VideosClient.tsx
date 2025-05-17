"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  useSearchParams,
  useRouter,
  usePathname,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { columns } from "./columns";
import {
  DataTable,
  DataTableFilterField,
  BulkAction,
} from "@/components/ui/dataTable";
import {
  fetchVideosForTable,
  VideoForTable,
} from "./_actions/videoTableActions";
import { toast } from "sonner";
import { Category, VideoStatus } from "@generated/prisma";
import { fetchAllCategories } from "../categories/_actions/categoryActions";
import {
  fetchNavigationVWTypes,
  NavigationVWType,
} from "@/app/admin/vwtypes/_actions/vwTypeActions";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  PaginationState,
  VisibilityState,
  RowSelectionState,
  Row,
} from "@tanstack/react-table";
import { formatVideoStatus } from "@/lib/utils/formatters";
import { Trash2, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  bulkDeleteVideos,
  bulkGenerateSlugsForVideos,
} from "./_actions/videoActions";

// Debounce Utility
function debounce<F extends (...args: Parameters<F>) => void>(
  func: F,
  delay: number,
): (...args: Parameters<F>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

// PersistentTableState Interface
interface PersistentTableState {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  pagination?: PaginationState;
  columnVisibility?: VisibilityState;
  globalFilter?: string;
}

// parseUrlState Function
function parseUrlState(
  searchParams: ReadonlyURLSearchParams,
  defaultPageSize: number = 50, // Allow passing default page size
): PersistentTableState {
  const sortField = searchParams.get("sort_field");
  const sortDir = searchParams.get("sort_dir");
  const sorting: SortingState =
    sortField && sortDir ? [{ id: sortField, desc: sortDir === "desc" }] : [];

  let columnFilters: ColumnFiltersState | undefined = undefined;
  const tempFilters: ColumnFiltersState = [];
  searchParams.forEach((value, key) => {
    if (key.startsWith("filter_")) {
      const columnId = key.substring("filter_".length);
      const filterValues = value ? value.split("-") : [];
      if (filterValues.length > 0) {
        tempFilters.push({ id: columnId, value: filterValues });
      }
    }
  });
  if (tempFilters.length > 0) columnFilters = tempFilters;

  const pageParam = searchParams.get("page");
  const pageIndex = pageParam ? Math.max(0, parseInt(pageParam, 10) - 1) : 0;

  const sizeParam = searchParams.get("pageSize");
  const pageSize = sizeParam
    ? Math.max(1, parseInt(sizeParam, 10))
    : defaultPageSize;

  return { sorting, columnFilters, pagination: { pageIndex, pageSize } };
}

function AdminVideosPageClientLoader() {
  return <p className="text-center py-10">Loading video manager...</p>;
}

export default function AdminVideosPageClient() {
  const [videos, setVideos] = useState<VideoForTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allVwTypes, setAllVwTypes] = useState<NavigationVWType[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [videosToBulkDelete, setVideosToBulkDelete] = useState<
    Row<VideoForTable>[]
  >([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const defaultPageSizeForTable = 50;

  const initialVideoTableFilters: ColumnFiltersState = useMemo(() => {
    return [
      {
        id: "status",
        value: [VideoStatus.DRAFT, VideoStatus.PUBLISHED],
      },
    ];
  }, []);

  // Table State Hooks
  const [isMounted, setIsMounted] = useState(false);
  const didHydrate = useRef(false);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initialVideoTableFilters,
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSizeForTable,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Memoize the function to get the initial state based on priority (URL > Defaults)
  const getInitialState = useCallback((): PersistentTableState => {
    const stateFromUrl = parseUrlState(searchParams, defaultPageSizeForTable);

    const defaultSorting: SortingState = [];
    const defaultColumnVisibility: VisibilityState = {};
    // initialColumnFilters is used directly for columnFilters default
    // defaultPagination is { pageIndex: 0, pageSize: defaultPageSizeForTable }

    const resolvedSorting: SortingState =
      stateFromUrl?.sorting ?? defaultSorting;

    const resolvedColumnFilters: ColumnFiltersState =
      stateFromUrl?.columnFilters ?? initialVideoTableFilters;

    const resolvedPagination: PaginationState = stateFromUrl?.pagination ?? {
      pageIndex: 0,
      pageSize: defaultPageSizeForTable,
    };

    const resolvedColumnVisibility: VisibilityState =
      stateFromUrl?.columnVisibility ?? defaultColumnVisibility;

    return {
      sorting: resolvedSorting,
      columnFilters: resolvedColumnFilters,
      pagination: resolvedPagination,
      columnVisibility: resolvedColumnVisibility,
    };
  }, [searchParams, initialVideoTableFilters, defaultPageSizeForTable]);

  // Debounced function to update URL
  const debouncedStateUpdate = useRef(
    debounce((newState: Omit<PersistentTableState, "globalFilter">) => {
      const params = new URLSearchParams(searchParams);
      Array.from(params.keys()).forEach((key) => {
        if (
          key.startsWith("filter_") ||
          key === "sort_field" ||
          key === "sort_dir" ||
          key === "page" ||
          key === "pageSize"
        ) {
          params.delete(key);
        }
      });

      if (newState.sorting && newState.sorting.length > 0) {
        params.set("sort_field", newState.sorting[0].id);
        params.set("sort_dir", newState.sorting[0].desc ? "desc" : "asc");
      }

      if (newState.columnFilters) {
        newState.columnFilters.forEach((filter) => {
          if (
            filter.value &&
            (Array.isArray(filter.value) ? filter.value.length > 0 : true)
          ) {
            params.set(
              `filter_${filter.id}`,
              Array.isArray(filter.value)
                ? filter.value.join("-")
                : String(filter.value),
            );
          }
        });
      }

      if (newState.pagination) {
        if (newState.pagination.pageIndex > 0) {
          params.set("page", (newState.pagination.pageIndex + 1).toString());
        } else {
          params.delete("page");
        }
        if (newState.pagination.pageSize !== defaultPageSizeForTable) {
          params.set("pageSize", newState.pagination.pageSize.toString());
        } else {
          params.delete("pageSize");
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 500),
  ).current;

  // Effect for initial mount and hydration
  useEffect(() => {
    setIsMounted(true); // Set mounted on first run

    // Hydration logic: runs only once after mount if not already hydrated
    if (!didHydrate.current) {
      // Call getInitialState directly here.
      // Its own useCallback dependencies (searchParams, etc.) will be from the initial render.
      const clientSideInitialState = getInitialState();

      setSorting(clientSideInitialState.sorting ?? []);
      setColumnFilters(
        clientSideInitialState.columnFilters ?? initialVideoTableFilters,
      );
      setPagination(
        clientSideInitialState.pagination ?? {
          pageIndex: 0,
          pageSize: defaultPageSizeForTable,
        },
      );
      setColumnVisibility(clientSideInitialState.columnVisibility ?? {});

      didHydrate.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this effect runs only once after the initial render.
  // getInitialState will be called with the searchParams from that initial render.

  // Effect for synchronizing state to URL (this one correctly depends on state changes)
  useEffect(() => {
    if (isMounted && didHydrate.current) {
      // Ensure hydration is complete before syncing
      debouncedStateUpdate({
        sorting,
        columnFilters,
        pagination,
        columnVisibility,
      });
    }
  }, [
    sorting,
    columnFilters,
    pagination,
    columnVisibility,
    isMounted, // isMounted ensures we don't sync on the very first render before hydration effect runs
    debouncedStateUpdate, // debouncedStateUpdate is stable (ref.current)
  ]);

  const handleResetTableConfig = useCallback(() => {
    console.log("Resetting table config to URL defaults");
    // Reset state variables
    setSorting([]);
    setColumnFilters(initialVideoTableFilters);
    setPagination({ pageIndex: 0, pageSize: defaultPageSizeForTable });
    setColumnVisibility({});
    setGlobalFilter("");
    setRowSelection({});

    // The sync useEffect will automatically update the URL to a clean state (reflecting defaults).
  }, [initialVideoTableFilters, defaultPageSizeForTable]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [videosResult, categoriesResult, vwTypesResult] = await Promise.all(
        [fetchVideosForTable(), fetchAllCategories(), fetchNavigationVWTypes()],
      );

      if (videosResult.success && videosResult.data) {
        setVideos(videosResult.data);
      } else {
        setError(videosResult.error || "Failed to fetch videos.");
        toast.error(videosResult.error || "Failed to fetch videos.");
      }

      if (categoriesResult.success && categoriesResult.data) {
        setAllCategories(categoriesResult.data);
      } else {
        // Non-critical, but log it or show a minor toast
        console.warn(
          categoriesResult.error || "Failed to fetch categories for filters.",
        );
        toast.warning(
          categoriesResult.error || "Failed to fetch categories for filters.",
        );
      }

      if (vwTypesResult.success && vwTypesResult.data) {
        setAllVwTypes(vwTypesResult.data);
      } else {
        console.warn(
          vwTypesResult.error || "Failed to fetch VW Types for filters.",
        );
        toast.warning(
          vwTypesResult.error || "Failed to fetch VW Types for filters.",
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast.error(`Error loading data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      // Only load data if component is mounted and hydrated
      loadData();
    }
  }, [isMounted, loadData]); // Include loadData in dependencies

  // Bulk Action Handlers
  const handleBulkDeleteRequest = useCallback(
    (selectedRows: Row<VideoForTable>[]) => {
      if (selectedRows.length === 0) {
        toast.info("No videos selected for deletion.");
        return;
      }
      setVideosToBulkDelete(selectedRows);
      setShowBulkDeleteDialog(true);
    },
    [],
  );

  const confirmBulkDelete = useCallback(async () => {
    if (videosToBulkDelete.length === 0) return;

    const videoIds = videosToBulkDelete.map((row) => row.original.id);
    toast.promise(bulkDeleteVideos(videoIds), {
      loading: `Deleting ${videoIds.length} video(s)...`,
      success: (result) => {
        loadData(); // Refresh data
        setShowBulkDeleteDialog(false);
        setVideosToBulkDelete([]);
        return (
          result.message ||
          `${result.count || videoIds.length} video(s) deleted successfully.`
        );
      },
      error: (err) => {
        setShowBulkDeleteDialog(false); // Still close dialog on error
        return err.message || "Failed to delete selected videos.";
      },
    });
  }, [videosToBulkDelete, loadData]);

  const handleBulkGenerateSlugs = useCallback(
    async (selectedRows: Row<VideoForTable>[]) => {
      if (selectedRows.length === 0) {
        toast.info("No videos selected for slug generation.");
        return;
      }
      const videoIds = selectedRows.map((row) => row.original.id);
      toast.promise(bulkGenerateSlugsForVideos(videoIds), {
        loading: `Generating slugs for ${videoIds.length} video(s)...`,
        success: (result) => {
          loadData(); // Refresh data
          return (
            result.message ||
            `${result.count || videoIds.length} video slug(s) generated/updated.`
          );
        },
        error: (err) =>
          err.message || "Failed to generate slugs for selected videos.",
      });
    },
    [loadData],
  );

  // Define bulk actions array
  const videoBulkActions: BulkAction<VideoForTable>[] = useMemo(
    () => [
      {
        label: "Generate Slug(s)",
        icon: Sparkles,
        action: handleBulkGenerateSlugs,
      },
      {
        label: "Delete Selected",
        icon: Trash2,
        action: handleBulkDeleteRequest, // This opens the confirmation dialog
        isDestructive: true,
      },
    ],
    [handleBulkGenerateSlugs, handleBulkDeleteRequest],
  );

  const facetFilters = useMemo((): DataTableFilterField<VideoForTable>[] => {
    const statusOptions = Object.values(VideoStatus).map((status) => ({
      label: formatVideoStatus(status),
      value: status,
    }));

    const categoryOptions = allCategories.map((cat) => ({
      label: cat.name,
      value: cat.id.toString(),
    }));

    const vwTypeOptions = allVwTypes.map((type) => ({
      label: type.name,
      value: type.slug,
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
  }, [allCategories, allVwTypes]);

  if (isLoading) {
    // Use the same loader component for consistency during data fetching
    return <AdminVideosPageClientLoader />;
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

      <DataTable<VideoForTable, unknown>
        columns={columns as ColumnDef<VideoForTable, unknown>[]}
        data={videos}
        filterColumnPlaceholder="Search in title and video ID..."
        facetFilters={facetFilters}
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={pagination}
        onPaginationChange={setPagination}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onResetTableConfig={handleResetTableConfig}
        bulkActions={videoBulkActions}
        initialColumnPinning={{ right: ["actions"] }}
      />

      {videosToBulkDelete.length > 0 && (
        <AlertDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
        >
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Bulk Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {videosToBulkDelete.length}{" "}
                video(s)? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowBulkDeleteDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete {videosToBulkDelete.length} Video(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

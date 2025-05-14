"use client";

import {
  useEffect,
  useState,
  useMemo,
  Suspense,
  useCallback,
  useRef,
} from "react";
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
import { DataTable, DataTableFilterField } from "@/components/ui/dataTable";
import {
  fetchVideosForTable,
  VideoForTable,
} from "./_actions/videoTableActions";
import { toast } from "sonner";
import { Category, VideoStatus, VWType } from "@generated/prisma";
import { fetchAllCategories } from "../categories/_actions/categoryActions";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  PaginationState,
  VisibilityState,
  RowSelectionState,
} from "@tanstack/react-table";
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

export default function AdminVideosPage() {
  return (
    <Suspense fallback={<AdminVideosPageClientLoader />}>
      <AdminVideosPageClient />
    </Suspense>
  );
}

function AdminVideosPageClientLoader() {
  return <p className="text-center py-10">Loading video manager...</p>;
}

function AdminVideosPageClient() {
  const [videos, setVideos] = useState<VideoForTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

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
      console.log("Hydrating with (runs once):", clientSideInitialState);

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
      console.log("Syncing state to URL:", {
        sorting,
        columnFilters,
        pagination,
        columnVisibility,
      });
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
      />
    </>
  );
}

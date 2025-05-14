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
import { DataTable, DataTableFilterField } from "@/components/ui/dataTable";
import { toast } from "sonner";
import { Category } from "@generated/prisma";
import { fetchAllCategories, deleteCategory } from "./_actions/categoryActions";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  PaginationState,
  VisibilityState,
  RowSelectionState,
} from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
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

// --- Debounce Utility ---
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

// --- PersistentTableState Interface ---
interface PersistentTableState {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  pagination?: PaginationState;
  columnVisibility?: VisibilityState;
  // globalFilter is not typically persisted here, managed by its own useState
}

// --- parseUrlState Function ---
function parseUrlState(
  searchParams: ReadonlyURLSearchParams,
  defaultPageSize: number,
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

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<AdminCategoriesPageClientLoader />}>
      <AdminCategoriesPageClient />
    </Suspense>
  );
}

function AdminCategoriesPageClientLoader() {
  return <p className="text-center py-10">Loading categories...</p>;
}

// Define CategoryForTable if it needs to differ from Prisma Category, otherwise use Category directly
type CategoryForTable = Category & {
  videoCount?: number; // This will be populated from _count
  _count?: {
    // Optional _count property from Prisma if selected
    videos?: number;
  };
};

function AdminCategoriesPageClient() {
  const [categories, setCategories] = useState<CategoryForTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultPageSizeForTable = 20; // Or 50, or whatever you prefer for categories
  const initialCategoryTableFilters: ColumnFiltersState = useMemo(() => [], []); // No default filters for categories

  // Table State Hooks
  const [isMounted, setIsMounted] = useState(false);
  const didHydrate = useRef(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initialCategoryTableFilters,
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSizeForTable,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const getInitialState = useCallback((): PersistentTableState => {
    const stateFromUrl = parseUrlState(searchParams, defaultPageSizeForTable);
    const defaultSorting: SortingState = [];
    const defaultColumnVisibility: VisibilityState = {};

    return {
      sorting: stateFromUrl?.sorting ?? defaultSorting,
      columnFilters: stateFromUrl?.columnFilters ?? initialCategoryTableFilters,
      pagination: stateFromUrl?.pagination ?? {
        pageIndex: 0,
        pageSize: defaultPageSizeForTable,
      },
      columnVisibility:
        stateFromUrl?.columnVisibility ?? defaultColumnVisibility,
    };
  }, [searchParams, initialCategoryTableFilters, defaultPageSizeForTable]);

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

  useEffect(() => {
    setIsMounted(true);
    if (!didHydrate.current) {
      const clientSideInitialState = getInitialState();
      setSorting(clientSideInitialState.sorting ?? []);
      setColumnFilters(
        clientSideInitialState.columnFilters ?? initialCategoryTableFilters,
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
  }, []);

  useEffect(() => {
    if (isMounted && didHydrate.current) {
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
    isMounted,
    debouncedStateUpdate,
  ]);

  const handleResetTableConfig = useCallback(() => {
    setSorting([]);
    setColumnFilters(initialCategoryTableFilters);
    setPagination({ pageIndex: 0, pageSize: defaultPageSizeForTable });
    setColumnVisibility({});
    setGlobalFilter("");
    setRowSelection({});
  }, [initialCategoryTableFilters, defaultPageSizeForTable]);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchAllCategories();
      if (result.success && result.data) {
        setCategories(
          result.data.map((cat) => ({
            ...cat,
            videoCount: (cat as CategoryForTable)._count?.videos || 0,
          })),
        );
      } else {
        setError(result.error || "Failed to fetch categories.");
        toast.error(result.error || "Failed to fetch categories.");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast.error(`Error loading categories: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    const result = await deleteCategory(categoryToDelete.id);
    if (result.success) {
      toast.success(
        `Category \"${categoryToDelete.name}\" deleted successfully.`,
      );
      setCategories((prev) =>
        prev.filter((cat) => cat.id !== categoryToDelete.id),
      );
    } else {
      // The type for deleteCategory result is { success: boolean; message: string; }
      // So, only result.message is available for the error detail.
      toast.error(result.message || "Failed to delete category.");
    }
    setShowDeleteDialog(false);
    setCategoryToDelete(null);
  };

  const columns: ColumnDef<CategoryForTable>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        enableSorting: true,
      },
      {
        accessorKey: "name",
        header: "Name",
        enableSorting: true,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
          const description = row.getValue("description") as string | null;
          return description ? (
            <span title={description}>
              {description.length > 50
                ? description.substring(0, 50) + "..."
                : description}
            </span>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          );
        },
      },
      {
        accessorKey: "videos", // Assuming you might want to show video count
        header: "Video Count",
        cell: ({ row }) => {
          // This assumes 'videos' on CategoryForTable is an array of associated video IDs or objects
          // If it's already a count (like our CategoryForTable example), use that directly.
          const videoCount = row.original.videoCount;
          return videoCount ?? 0;
        },
        enableSorting: true, // You might want to sort by video count
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild // Important for Link to work correctly within Button
            >
              <Link href={`/admin/categories/edit/${row.original.id}`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setCategoryToDelete(row.original);
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [], // No external dependencies for these basic columns, add if any are used (like 'allCategories' for a dropdown filter in-column)
  );

  // Define facetFilters if needed, for now an empty array as categories are simple
  const facetFilters = useMemo((): DataTableFilterField<CategoryForTable>[] => {
    return []; // No facet filters for categories in this example
  }, []);

  if (isLoading) return <AdminCategoriesPageClientLoader />;
  if (error)
    return <p className="text-center text-red-500 py-10">Error: {error}</p>;

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Categories</h1>
        <Button asChild>
          <Link href="/admin/categories/new">
            <PlusIcon className="mr-2 h-4 w-4" /> Add Category
          </Link>
        </Button>
      </div>

      <DataTable<CategoryForTable, unknown>
        // No key={tableKey} needed anymore
        columns={columns}
        data={categories}
        filterColumnPlaceholder="Search categories..."
        facetFilters={facetFilters} // Pass even if empty
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

      {categoryToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete &quot;{categoryToDelete.name}
                &quot;?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                category.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  useRouter,
  usePathname,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
  Row,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  FilterFn, // Import FilterFn type
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  XIcon,
  RotateCcw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { PlusIcon, SlidersHorizontalIcon } from "lucide-react";

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

// --- Types ---
export interface FacetFilterOption {
  label: string;
  value: string | number; // Allow number for potential future use, but treat as string for filtering
  icon?: React.ComponentType<{ className?: string }>;
}

export interface DataTableFilterField<TData> {
  columnId: Extract<keyof TData, string>;
  title: string;
  options: FacetFilterOption[];
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  localStorageKey: string;
  filterColumnPlaceholder?: string;
  facetFilters?: DataTableFilterField<TData>[];
  initialColumnFilters?: ColumnFiltersState;
}

// Interface for the state stored in localStorage and potentially passed around
interface PersistentTableState {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  pagination?: PaginationState;
  columnVisibility?: VisibilityState;
}

// --- Helper Functions ---

// Parse state from URL Search Params
function parseUrlState(
  searchParams: ReadonlyURLSearchParams,
): PersistentTableState {
  const sortField = searchParams.get("sort_field");
  const sortDir = searchParams.get("sort_dir");
  const sorting: SortingState =
    sortField && sortDir ? [{ id: sortField, desc: sortDir === "desc" }] : [];

  let columnFilters: ColumnFiltersState | undefined = undefined; // Initialize as undefined
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

  if (tempFilters.length > 0) {
    columnFilters = tempFilters; // Assign only if filters were found
  }

  const pageParam = searchParams.get("page");
  const pageIndex = pageParam ? Math.max(0, parseInt(pageParam, 10) - 1) : 0;

  const sizeParam = searchParams.get("pageSize");
  const pageSize = sizeParam ? Math.max(1, parseInt(sizeParam, 10)) : 50;

  // Ensure columnFilters is part of the returned object, possibly as undefined
  return { sorting, columnFilters, pagination: { pageIndex, pageSize } };
}

// Custom filter function for checking if a row's array value includes any of the filter values
const arrIncludesSome: FilterFn<unknown> = <TData,>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown[], // The value from the filter input (e.g., ["1", "3"] for category IDs)
): boolean => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true; // No filter selected, so all rows pass
  }
  const rowValue = row.getValue(columnId);

  // --- Specific handling for 'categories' column ---
  // It expects rowValue to be like [{ category: { id: number, ... } }, ...]
  // and filterValue to be string IDs ["1", "3", ...]
  if (columnId === "categories" && Array.isArray(rowValue)) {
    try {
      const rowCategoryIds = rowValue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => String(item?.category?.id)) // Extract ID as string
        .filter((id) => id !== "undefined" && id !== "null"); // Filter out invalid IDs

      // Check if any of the row's category IDs match any of the selected filter IDs
      return filterValue.some((filterId) =>
        rowCategoryIds.includes(String(filterId)),
      );
    } catch (error) {
      console.error("Error processing categories filter:", error, {
        rowValue,
        filterValue,
      });
      return false; // Error occurred, filter out row to be safe
    }
  }
  // --- End specific handling for 'categories' ---

  // Handle other array values (like vwTypes - assuming they are simple string/enum arrays)
  if (Array.isArray(rowValue)) {
    // Check if any selected filter values are present in the row's array
    // Ensure comparison uses strings for consistency
    return filterValue.some((val) =>
      rowValue.map(String).includes(String(val)),
    );
  }

  // Handle single value columns (like status)
  // Ensure comparison uses strings
  return filterValue.includes(String(rowValue));
};

// --- DataTable Component ---
export function DataTable<TData, TValue>({
  columns,
  data,
  localStorageKey,
  filterColumnPlaceholder = "Filter...",
  facetFilters = [],
  initialColumnFilters = [],
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isMounted, setIsMounted] = useState(false);
  const didHydrate = useRef(false); // Ref to track hydration

  // Memoize the function to get the initial state based on priority
  const getInitialState = useCallback((): PersistentTableState => {
    let stateFromStorage: PersistentTableState | null = null;
    if (typeof window !== "undefined") {
      try {
        const storedState = localStorage.getItem(localStorageKey);
        if (storedState) {
          stateFromStorage = JSON.parse(storedState);
        }
      } catch (e) {
        console.error("Failed to parse table state from localStorage:", e);
      }
    }

    const stateFromUrl = parseUrlState(searchParams);

    // Define default states
    const defaultPagination: PaginationState = { pageIndex: 0, pageSize: 50 }; // CHANGED
    const defaultSorting: SortingState = []; // Default to no sorting unless specified
    const defaultColumnVisibility: VisibilityState = {}; // Default to all visible unless specified

    // Prioritize: localStorage > URL > Props (initialColumnFilters) > Defaults
    const resolvedSorting: SortingState =
      stateFromStorage?.sorting ?? stateFromUrl?.sorting ?? defaultSorting;
    const resolvedColumnFilters: ColumnFiltersState =
      stateFromStorage?.columnFilters ??
      stateFromUrl?.columnFilters ??
      initialColumnFilters;
    const resolvedPagination: PaginationState =
      stateFromStorage?.pagination ??
      stateFromUrl?.pagination ??
      defaultPagination;
    const resolvedColumnVisibility: VisibilityState =
      stateFromStorage?.columnVisibility ?? defaultColumnVisibility; // Add visibility persistence

    return {
      sorting: resolvedSorting,
      columnFilters: resolvedColumnFilters,
      pagination: resolvedPagination,
      columnVisibility: resolvedColumnVisibility,
    };
  }, [localStorageKey, searchParams, initialColumnFilters]);

  // Initialize state hooks, run getInitialState only once initially
  const initialComputedState = useRef(getInitialState());

  const [sorting, setSorting] = useState<SortingState>(
    initialComputedState.current.sorting ?? [],
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initialComputedState.current.columnFilters ?? [],
  );
  const [pagination, setPagination] = useState<PaginationState>(
    initialComputedState.current.pagination ?? { pageIndex: 0, pageSize: 50 },
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialComputedState.current.columnVisibility ?? {},
  );
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState(""); // State for global filter input

  // --- State Synchronization Effect ---
  // Debounced function to update localStorage and URL
  const debouncedStateUpdate = useRef(
    debounce(
      (newState: PersistentTableState) => {
        // 1. Update localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(localStorageKey, JSON.stringify(newState));
        }

        // 2. Update URL Search Params
        const params = new URLSearchParams(searchParams);

        // Clear old params related to table state first
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

        // Set new sorting params
        if (newState.sorting && newState.sorting.length > 0) {
          params.set("sort_field", newState.sorting[0].id);
          params.set("sort_dir", newState.sorting[0].desc ? "desc" : "asc");
        }

        // Set new filter params
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

        // Set new pagination params (only if not default)
        const defaultPageSize = 50; // CHANGED
        if (newState.pagination && newState.pagination.pageIndex > 0) {
          params.set("page", (newState.pagination.pageIndex + 1).toString());
        }
        if (
          newState.pagination &&
          newState.pagination.pageSize !== defaultPageSize
        ) {
          params.set("pageSize", newState.pagination.pageSize.toString());
        }

        // Use router.replace to avoid adding to browser history
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      },
      500, // 500ms debounce delay
    ),
  ).current;

  // Effect to set mounted flag
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Effect to handle initial state hydration from client-side sources (runs only once after mount)
  useEffect(() => {
    // Only run hydration if mounted and haven't hydrated yet
    if (isMounted && !didHydrate.current) {
      const clientSideInitialState = getInitialState();

      // Set initial state directly
      setSorting(clientSideInitialState.sorting ?? []);
      setColumnFilters(clientSideInitialState.columnFilters ?? []);
      setPagination(
        clientSideInitialState.pagination ?? { pageIndex: 0, pageSize: 50 },
      );
      setColumnVisibility(clientSideInitialState.columnVisibility ?? {});

      // Mark hydration as done
      didHydrate.current = true;
    }
    // getInitialState is included because it's used inside, satisfying linter.
    // The didHydrate ref prevents re-setting state even if getInitialState changes.
  }, [isMounted, getInitialState]);

  // State Synchronization Effect (runs whenever state changes *after* mount)
  useEffect(() => {
    // Only run sync if mounted (which implies hydration attempt has happened)
    if (isMounted) {
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
    debouncedStateUpdate,
    isMounted, // Ensure sync only happens client-side after mount
  ]);

  // --- TanStack Table Instance ---
  const table = useReactTable<TData>({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination,
    },
    // Pipeline
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(), // Needed for facet filters
    getFacetedUniqueValues: getFacetedUniqueValues(), // Needed for facet filters

    // State Change Handlers
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,

    // Filter Functions
    filterFns: {
      arrIncludesSome, // Register custom filter
    },
    // globalFilterFn: 'auto', // Use default global filter (searches all columns) or provide a custom one if needed
    // enableGlobalFilter: true, // Ensure global filtering is enabled
  });

  const handleReset = () => {
    // Clear all table state
    setSorting([]);
    setColumnFilters(initialColumnFilters);
    setPagination({ pageIndex: 0, pageSize: 50 });
    setColumnVisibility({});
    setGlobalFilter("");
    setRowSelection({});

    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem(localStorageKey);
    }
  };

  // --- Render Logic ---
  // Render null or a loader until mounted to avoid hydration errors
  if (!isMounted) {
    return null; // Or a loading skeleton
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Filters + Column Visibility */}
      <div className="flex items-center gap-2">
        {/* Global Filter Input */}
        <div className="relative w-full max-w-sm">
          <Input
            placeholder={filterColumnPlaceholder}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="h-8 pr-8"
          />
          {globalFilter && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setGlobalFilter("");
              }}
            >
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Clear</span>
            </Button>
          )}
        </div>

        {/* Facet Filters Dropdowns */}
        {facetFilters.map((facet) => {
          const column = table.getColumn(facet.columnId);
          if (!column) {
            console.warn(`Facet filter column not found: ${facet.columnId}`);
            return null;
          }
          const selectedValues =
            (column.getFilterValue() as string[] | undefined) ?? [];

          return (
            <DropdownMenu key={facet.columnId}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-dashed"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />{" "}
                  {/* Consider using PlusIcon */}
                  {facet.title}
                  {selectedValues?.length > 0 && (
                    <span className="ml-2 rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                      {selectedValues.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {facet.options.map((option) => {
                  const isChecked = selectedValues.includes(
                    String(option.value),
                  );
                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const newValue = String(option.value);
                        const currentFilter =
                          (column.getFilterValue() as string[] | undefined) ??
                          [];
                        let newFilter: string[];
                        if (checked) {
                          newFilter = [...currentFilter, newValue];
                        } else {
                          newFilter = currentFilter.filter(
                            (v) => v !== newValue,
                          );
                        }
                        // Set filter to undefined if empty to remove it from state
                        column.setFilterValue(
                          newFilter.length > 0 ? newFilter : undefined,
                        );
                      }}
                    >
                      {option.icon && (
                        <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      )}
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
                {selectedValues.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => column.setFilterValue(undefined)}
                      className="justify-center text-center"
                    >
                      Clear filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {/* Reset Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={handleReset}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>

        {/* Column Visibility Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto hidden h-8 lg:flex"
            >
              <SlidersHorizontalIcon className="mr-2 h-4 w-4" />{" "}
              {/* Consider other icons */}
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" &&
                  column.getCanHide(),
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    <span className="truncate">{column.id}</span>{" "}
                    {/* Better label than index */}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        {/* Row Selection Count */}
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          {/* Rows per page selector */}
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Page Indicator */}
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          {/* Pagination Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

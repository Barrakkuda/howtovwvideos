"use client";

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
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { PlusIcon, SlidersHorizontalIcon } from "lucide-react";

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

export interface BulkAction<TData> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  action: (selectedRows: Row<TData>[]) => void | Promise<void>;
  isDestructive?: boolean; // Optional: for styling destructive actions like delete
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumnPlaceholder?: string;
  facetFilters?: DataTableFilterField<TData>[];
  sorting: SortingState;
  onSortingChange: React.Dispatch<React.SetStateAction<SortingState>>;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: React.Dispatch<
    React.SetStateAction<ColumnFiltersState>
  >;
  pagination: PaginationState;
  onPaginationChange: React.Dispatch<React.SetStateAction<PaginationState>>;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: React.Dispatch<
    React.SetStateAction<VisibilityState>
  >;
  globalFilter: string;
  onGlobalFilterChange: React.Dispatch<React.SetStateAction<string>>;
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  onResetTableConfig: () => void;
  bulkActions?: BulkAction<TData>[];
}

// --- Helper Functions ---

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
  filterColumnPlaceholder = "Filter...",
  facetFilters = [],
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  pagination,
  onPaginationChange,
  columnVisibility,
  onColumnVisibilityChange,
  globalFilter,
  onGlobalFilterChange,
  rowSelection,
  onRowSelectionChange,
  onResetTableConfig,
  bulkActions = [],
}: DataTableProps<TData, TValue>) {
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
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),

    // State Change Handlers
    onSortingChange: onSortingChange,
    onColumnFiltersChange: onColumnFiltersChange,
    onColumnVisibilityChange: onColumnVisibilityChange,
    onRowSelectionChange: onRowSelectionChange,
    onGlobalFilterChange: onGlobalFilterChange,
    onPaginationChange: onPaginationChange,

    // Filter Functions
    filterFns: {
      arrIncludesSome,
    },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar: Filters + Column Visibility */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Global Filter Input */}
        <div className="relative w-full max-w-xs sm:max-w-sm">
          <Input
            placeholder={filterColumnPlaceholder}
            value={globalFilter ?? ""}
            onChange={(event) =>
              onGlobalFilterChange(String(event.target.value))
            }
            className="h-8 pr-8"
          />
          {globalFilter && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                onGlobalFilterChange("");
              }}
            >
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Clear</span>
            </Button>
          )}
        </div>

        {/* Bulk Actions Dropdown */}
        {bulkActions && bulkActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={table.getFilteredSelectedRowModel().rows.length === 0}
              >
                Bulk Actions ({table.getFilteredSelectedRowModel().rows.length})
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {bulkActions.map((item, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={async () => {
                    await item.action(table.getFilteredSelectedRowModel().rows);
                    table.resetRowSelection(true); // Clear selection after action
                  }}
                  className={
                    item.isDestructive
                      ? "text-red-600 hover:!text-red-600 focus:!text-red-600 dark:text-red-500 dark:hover:!text-red-500 dark:focus:!text-red-500"
                      : ""
                  }
                >
                  {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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
          onClick={onResetTableConfig}
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

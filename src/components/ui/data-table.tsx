"use client";

import { useEffect, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  HeaderGroup,
  Row,
  Cell,
  Column,
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
} from "@/components/ui/dropdown-menu";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumnId?: string;
  filterColumnPlaceholder?: string;
  facetFilters?: DataTableFilterField<TData>[];
  initialColumnFilters?: ColumnFiltersState;
  searchableColumns?: string[];
}

export interface FacetFilterOption {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface DataTableFilterField<TData> {
  columnId: Extract<keyof TData, string>;
  title: string;
  options: FacetFilterOption[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumnId,
  filterColumnPlaceholder = "Filter...",
  facetFilters = [],
  initialColumnFilters,
  searchableColumns = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const searchTerm = String(filterValue).toLowerCase();

      // If no searchable columns specified, search all columns
      const columnsToSearch =
        searchableColumns.length > 0
          ? searchableColumns
          : columns
              .map((col) => ("id" in col ? col.id : null))
              .filter((id): id is string => id !== null);

      return columnsToSearch.some((columnId) => {
        const value = row.getValue(columnId);
        if (value == null) return false;

        if (typeof value === "string") {
          return value.toLowerCase().includes(searchTerm);
        }
        if (typeof value === "number") {
          return String(value).includes(searchTerm);
        }
        if (Array.isArray(value)) {
          return value.some((v) => {
            if (typeof v === "object" && v !== null) {
              return Object.values(v).some((val) =>
                String(val).toLowerCase().includes(searchTerm),
              );
            }
            return String(v).toLowerCase().includes(searchTerm);
          });
        }
        return String(value).toLowerCase().includes(searchTerm);
      });
    },
    initialState: {
      pagination: {
        pageSize: 100,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    filterFns: {
      arrIncludesSome: (row, columnId, filterValue: (string | number)[]) => {
        const value = row.getValue(columnId);

        if (!filterValue?.length) return true;

        // Special handling for categories
        if (columnId === "categories") {
          const categories = value as { category: { id: number } }[];
          const categoryIds = categories.map((cat) => String(cat.category.id));
          return categoryIds.some((id) => filterValue.includes(id));
        }

        // Default handling for other columns
        if (Array.isArray(value)) {
          return value.some((v) => filterValue.includes(String(v)));
        }
        return filterValue.includes(String(value));
      },
    },
  });

  // Effect to set the filter function for facet columns
  useEffect(() => {
    facetFilters.forEach((facet) => {
      const column = table.getColumn(facet.columnId);
      if (column) {
        column.columnDef.filterFn = "arrIncludesSome";
      }
    });
  }, [facetFilters, table]);

  // Effect to set initial column filters once data is available
  useEffect(() => {
    // Check if data is loaded, initialColumnFilters are provided, and no filters are currently set
    if (
      data &&
      data.length > 0 &&
      initialColumnFilters &&
      initialColumnFilters.length > 0
    ) {
      const currentTableFilters = table.getState().columnFilters;
      if (currentTableFilters.length === 0) {
        table.setColumnFilters(initialColumnFilters);
      }
    }
  }, [data, initialColumnFilters, table]); // table.setColumnFilters can be added if stable

  return (
    <div>
      {/* Filter and Column Toggle */}
      <div className="flex items-center py-4">
        {/* Global Search Input */}
        <Input
          placeholder={filterColumnPlaceholder}
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />

        {filterColumnId && (
          <Input
            placeholder={filterColumnPlaceholder}
            value={
              (table.getColumn(filterColumnId)?.getFilterValue() as string) ??
              ""
            }
            onChange={(event) =>
              table
                .getColumn(filterColumnId)
                ?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        )}
        {facetFilters.map((facet) => (
          <DropdownMenu key={facet.columnId}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-2">
                {facet.title}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {facet.options.map((option) => {
                const currentValue =
                  (table.getColumn(facet.columnId)?.getFilterValue() as (
                    | string
                    | number
                  )[]) || [];
                return (
                  <DropdownMenuCheckboxItem
                    key={option.value.toString()}
                    checked={currentValue.includes(option.value)}
                    onCheckedChange={(checked) => {
                      const newValue = checked
                        ? [...currentValue, option.value]
                        : currentValue.filter((v) => v !== option.value);
                      table
                        .getColumn(facet.columnId)
                        ?.setFilterValue(
                          newValue.length ? newValue : undefined,
                        );
                    }}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column: Column<TData, unknown>) => column.getCanHide())
              .map((column: Column<TData, unknown>) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
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
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(
                  (header: (typeof headerGroup.headers)[number]) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  },
                )}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
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

      {/* Item Count and Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <strong>
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}
            -
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            )}
          </strong>{" "}
          of <strong>{table.getFilteredRowModel().rows.length}</strong> entries
          {table.getFilteredRowModel().rows.length <
            table.getCoreRowModel().rows.length && (
            <span>
              {" "}
              (filtered from {table.getCoreRowModel().rows.length} total
              entries)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

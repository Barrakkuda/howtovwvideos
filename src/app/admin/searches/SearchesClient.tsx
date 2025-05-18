"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PaginationState,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/ui/dataTable";
import {
  fetchSearchLogs,
  SearchLogForTable,
  FetchSearchLogsResponse,
} from "@/app/_actions/loggingActions";
import { columns } from "./columns";

function AdminSearchLogsPageClientLoader() {
  return <p className="text-center py-10">Loading search logs...</p>;
}

export default function AdminSearchLogsPage() {
  const [logs, setLogs] = useState<SearchLogForTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DataTable state hooks - using sensible defaults
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // Tanstack table is 0-indexed for pageIndex
    pageSize: 20,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [totalPages, setTotalPages] = useState(0);

  const loadSearchLogs = useCallback(
    async (
      currentPage: number,
      currentSize: number,
      currentSorting: SortingState,
    ) => {
      setIsLoading(true);
      try {
        const sortBy =
          currentSorting.length > 0 ? currentSorting[0].id : "createdAt";
        const sortDirection =
          currentSorting.length > 0
            ? currentSorting[0].desc
              ? "desc"
              : "asc"
            : "desc";

        const result: FetchSearchLogsResponse = await fetchSearchLogs({
          page: currentPage + 1, // API is 1-indexed
          pageSize: currentSize,
          sortBy: sortBy,
          sortDirection: sortDirection,
        });
        if (result.success && result.data) {
          setLogs(result.data);
          setTotalPages(result.totalPages || 0);
          setError(null);
        } else {
          setError(result.error || "Failed to load search logs.");
          toast.error(result.error || "Failed to load search logs.");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(errorMessage);
        toast.error(`Error loading data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadSearchLogs(pagination.pageIndex, pagination.pageSize, sorting);
  }, [loadSearchLogs, pagination.pageIndex, pagination.pageSize, sorting]);

  const handleResetTableConfig = useCallback(() => {
    setSorting([{ id: "createdAt", desc: true }]);
    setColumnFilters([]);
    setPagination({ pageIndex: 0, pageSize: 20 });
    setColumnVisibility({});
    setGlobalFilter("");
    setRowSelection({});
  }, []);

  if (isLoading && logs.length === 0) {
    // Show loader only on initial load
    return <AdminSearchLogsPageClientLoader />;
  }

  if (error && logs.length === 0) {
    // Show error only if no data could be loaded
    return <p className="text-center text-red-500 py-10">Error: {error}</p>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Search Log</h1>
      </div>

      <DataTable<SearchLogForTable, unknown>
        columns={columns}
        data={logs}
        filterColumnPlaceholder="Search by term or IP..."
        facetFilters={[]}
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={pagination}
        onPaginationChange={(newPagination) => {
          setPagination(newPagination);
        }}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onResetTableConfig={handleResetTableConfig}
        bulkActions={[]}
        pageCount={totalPages}
      />
    </>
  );
}

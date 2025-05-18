"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Channel } from "@generated/prisma";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { DataTable, BulkAction } from "@/components/ui/dataTable";
import { columns } from "./columns";
import { ChannelForm } from "./ChannelForm";
import { getChannels, bulkDeleteChannels } from "./_actions/channelActions";
import type {
  SortingState,
  ColumnFiltersState,
  Row,
} from "@tanstack/react-table";
import { toast } from "sonner";
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

export function ChannelsClient() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [channelsToBulkDelete, setChannelsToBulkDelete] = useState<
    Row<Channel>[]
  >([]);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Load channels
  const loadChannels = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getChannels();
      if (result.success && result.data) {
        setChannels(result.data);
      } else {
        console.error(result.error || "Failed to load channels");
      }
    } catch {
      console.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Reset table state
  const handleResetTableConfig = () => {
    setSorting([]);
    setColumnFilters([]);
    setColumnVisibility({});
    setRowSelection({});
    setGlobalFilter("");
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  // Bulk Action Handlers
  const handleBulkDeleteRequest = useCallback(
    (selectedRows: Row<Channel>[]) => {
      if (selectedRows.length === 0) {
        toast.info("No channels selected for deletion.");
        return;
      }
      setChannelsToBulkDelete(selectedRows);
      setShowBulkDeleteDialog(true);
    },
    [],
  );

  const confirmBulkDelete = useCallback(async () => {
    if (channelsToBulkDelete.length === 0) return;

    const selectedIds = channelsToBulkDelete.map((row) => row.original.id);
    const result = await bulkDeleteChannels(selectedIds);

    if (result.success) {
      toast.success(result.message || "Channels deleted successfully");
      setRowSelection({});
      setShowBulkDeleteDialog(false);
      setChannelsToBulkDelete([]);
      loadChannels(); // Reload the table
    } else {
      toast.error(result.error || "Failed to delete channels");
      setShowBulkDeleteDialog(false);
    }
  }, [channelsToBulkDelete, loadChannels]);

  const bulkActions: BulkAction<Channel>[] = useMemo(
    () => [
      {
        label: "Delete Selected",
        icon: Trash2,
        action: handleBulkDeleteRequest,
        isDestructive: true,
      },
    ],
    [handleBulkDeleteRequest],
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Channels</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Channel
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={channels}
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
        onResetTableConfig={handleResetTableConfig}
        bulkActions={bulkActions}
      />

      <ChannelForm open={showAddModal} onOpenChange={setShowAddModal} />

      {/* Bulk Delete Confirmation Dialog */}
      {channelsToBulkDelete.length > 0 && (
        <AlertDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Bulk Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {channelsToBulkDelete.length}{" "}
                channel{channelsToBulkDelete.length === 1 ? "" : "s"}?
                <br />
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowBulkDeleteDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete {channelsToBulkDelete.length} Channel
                {channelsToBulkDelete.length === 1 ? "" : "s"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ColumnFiltersState,
  PaginationState,
  Row,
  RowSelectionState,
  SortingState,
  VisibilityState,
  ColumnDef,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { PlusIcon, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, BulkAction } from "@/components/ui/dataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

import { VWTypeFormData } from "@/lib/validators/vwtype";
import VWTypeForm from "@/components/admin/VWTypeForm";
import {
  fetchVWTypesForTable,
  addVWType,
  updateVWType,
  deleteVWType,
  bulkDeleteVWTypes,
  bulkGenerateSlugsForVWTypes,
  VWTypeForTable,
  ActionResponse,
} from "./_actions/vwTypeActions";
import { columns as createVWTypeColumns } from "./columns";

function AdminVWTypesPageClientLoader() {
  return <p className="text-center py-10">Loading VW Type manager...</p>;
}

export default function AdminVWTypesPageClient() {
  const [vwTypes, setVwTypes] = useState<VWTypeForTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVWType, setEditingVWType] = useState<VWTypeForTable | null>(
    null,
  );
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [vwTypeToDelete, setVwTypeToDelete] = useState<VWTypeForTable | null>(
    null,
  );

  // Bulk delete confirmation state
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [vwTypesToBulkDelete, setVwTypesToBulkDelete] = useState<
    Row<VWTypeForTable>[]
  >([]);

  // DataTable state hooks - using sensible defaults
  const [sorting, setSorting] = useState<SortingState>([
    { id: "sortOrder", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const loadVWTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchVWTypesForTable();
      if (result.success && result.data) {
        setVwTypes(result.data);
        setError(null);
      } else {
        setError(result.message || "Failed to load VW Types.");
        toast.error(result.message || "Failed to load VW Types.");
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
    loadVWTypes();
  }, [loadVWTypes]);

  // Modal handlers
  const handleOpenAddModal = useCallback(() => {
    setEditingVWType(null);
    setIsModalOpen(true);
  }, [setEditingVWType, setIsModalOpen]);

  const handleOpenEditModal = useCallback(
    (vwType: VWTypeForTable) => {
      setEditingVWType(vwType);
      setIsModalOpen(true);
    },
    [setEditingVWType, setIsModalOpen],
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingVWType(null); // Clear editing state
  }, [setIsModalOpen, setEditingVWType]);

  const handleFormSubmit = async (data: VWTypeFormData, id?: number) => {
    setIsSubmittingForm(true);
    let result: ActionResponse<VWTypeForTable>;

    const toastMessages = {
      loading: id
        ? `Updating VW Type "${data.name}"...`
        : `Adding VW Type "${data.name}"...`,
      success: (res: ActionResponse<VWTypeForTable>) =>
        res.message || (id ? "VW Type updated!" : "VW Type added!"),
      error: (err: { message?: string } | Error) =>
        err.message ||
        (id ? "Failed to update VW Type." : "Failed to add VW Type."),
    };

    try {
      if (id) {
        result = await updateVWType(id, data);
      } else {
        result = await addVWType(data);
      }

      if (result.success) {
        toast.success(toastMessages.success(result));
        loadVWTypes(); // Refresh data
        handleCloseModal();
      } else {
        let errorMsg = result.message || "An error occurred.";
        if (result.errors) {
          const fieldErrors = Object.entries(result.errors)
            .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
            .join("; ");
          errorMsg += ` Details: ${fieldErrors}`;
        }
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(
        toastMessages.error(
          error instanceof Error ? error : { message: "Unknown error" },
        ),
      );
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete handlers
  const handleDeleteRequest = useCallback(
    (vwType: VWTypeForTable) => {
      setVwTypeToDelete(vwType);
      setShowDeleteDialog(true);
    },
    [setVwTypeToDelete, setShowDeleteDialog],
  );

  const confirmDelete = async () => {
    if (!vwTypeToDelete) return;
    toast.promise(deleteVWType(vwTypeToDelete.id), {
      loading: `Deleting VW Type "${vwTypeToDelete.name}"...`,
      success: (result) => {
        loadVWTypes();
        setShowDeleteDialog(false);
        setVwTypeToDelete(null);
        return result.message || "VW Type deleted successfully.";
      },
      error: (err) => {
        setShowDeleteDialog(false);
        return err.message || "Failed to delete VW Type.";
      },
    });
  };

  // Bulk Action Handlers
  const handleBulkDeleteRequest = useCallback(
    (selectedRows: Row<VWTypeForTable>[]) => {
      if (selectedRows.length === 0) {
        toast.info("No VW Types selected for deletion.");
        return;
      }
      setVwTypesToBulkDelete(selectedRows);
      setShowBulkDeleteDialog(true);
    },
    [],
  );

  const confirmBulkDelete = useCallback(async () => {
    if (vwTypesToBulkDelete.length === 0) return;

    const ids = vwTypesToBulkDelete.map((row) => row.original.id);
    toast.promise(bulkDeleteVWTypes(ids), {
      loading: `Deleting ${ids.length} VW Type(s)...`,
      success: (result) => {
        loadVWTypes(); // Refresh data
        setShowBulkDeleteDialog(false);
        setVwTypesToBulkDelete([]);
        setRowSelection({}); // Clear selection
        return (
          result.message || `${result.count || ids.length} VW Type(s) deleted.`
        );
      },
      error: (err) => {
        setShowBulkDeleteDialog(false);
        return err.message || "Failed to delete selected VW Types.";
      },
    });
  }, [vwTypesToBulkDelete, loadVWTypes]);

  const handleBulkGenerateSlugs = useCallback(
    async (selectedRows: Row<VWTypeForTable>[]) => {
      if (selectedRows.length === 0) {
        toast.info("No VW Types selected for slug generation.");
        return;
      }
      const ids = selectedRows.map((row) => row.original.id);
      toast.promise(bulkGenerateSlugsForVWTypes(ids), {
        loading: `Generating slugs for ${ids.length} VW Type(s)...`,
        success: (result) => {
          loadVWTypes(); // Refresh data
          setRowSelection({}); // Clear selection
          return (
            result.message ||
            `${result.count || ids.length} slug(s) generated/updated.`
          );
        },
        error: (err) => err.message || "Failed to generate slugs.",
      });
    },
    [loadVWTypes],
  );

  const vwTypeColumns = useMemo(
    () => createVWTypeColumns(handleOpenEditModal, handleDeleteRequest),
    [handleOpenEditModal, handleDeleteRequest],
  );

  const bulkActions: BulkAction<VWTypeForTable>[] = useMemo(
    () => [
      {
        label: "Generate Slug(s)",
        icon: Sparkles,
        action: handleBulkGenerateSlugs,
      },
      {
        label: "Delete Selected",
        icon: Trash2,
        action: handleBulkDeleteRequest,
        isDestructive: true,
      },
    ],
    [handleBulkGenerateSlugs, handleBulkDeleteRequest],
  );

  const handleResetTableConfig = useCallback(() => {
    setSorting([{ id: "sortOrder", desc: false }]);
    setColumnFilters([]);
    setPagination({ pageIndex: 0, pageSize: 20 });
    setColumnVisibility({});
    setGlobalFilter("");
    setRowSelection({});
    // Note: URL persistence is not implemented here as it was in AdminVideosPage for brevity
    // If needed, similar logic from AdminVideosPage could be adapted.
  }, []);

  if (isLoading && vwTypes.length === 0) {
    return <AdminVWTypesPageClientLoader />;
  }

  if (error) {
    return <p className="text-center text-red-500 py-10">Error: {error}</p>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">VW Types</h1>
        <Button onClick={handleOpenAddModal}>
          <PlusIcon className="mr-2 h-4 w-4" /> Add VW Type
        </Button>
      </div>

      <DataTable<VWTypeForTable, unknown>
        columns={vwTypeColumns as ColumnDef<VWTypeForTable, unknown>[]} // Cast needed if using functional columns
        data={vwTypes}
        filterColumnPlaceholder="Search by name, slug..."
        facetFilters={[]} // No facet filters for VWTypes for now, add if needed
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
        bulkActions={bulkActions}
      />

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingVWType ? "Edit" : "Add New"} VW Type
            </DialogTitle>
            {editingVWType && (
              <DialogDescription>
                Editing: {editingVWType.name} (ID: {editingVWType.id})
              </DialogDescription>
            )}
          </DialogHeader>
          <VWTypeForm
            key={editingVWType ? `edit-${editingVWType.id}` : "add"} // Ensures form reset
            initialData={
              editingVWType
                ? {
                    ...editingVWType,
                    description: editingVWType.description ?? undefined,
                    slug: editingVWType.slug ?? undefined,
                  }
                : {}
            }
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmittingForm}
            onCancel={handleCloseModal} // Pass the cancel handler
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (Single) */}
      {vwTypeToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete VW Type?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the VW Type &quot;
                <strong>{vwTypeToDelete.name}</strong>&quot; (ID:{" "}
                {vwTypeToDelete.id})? This action cannot be undone and might
                affect associated videos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {vwTypesToBulkDelete.length > 0 && (
        <AlertDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Bulk Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {vwTypesToBulkDelete.length} VW
                Type(s)? This action cannot be undone and might affect
                associated videos.
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
                Delete {vwTypesToBulkDelete.length} VW Type(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

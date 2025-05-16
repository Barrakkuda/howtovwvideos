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
import { DataTable, BulkAction } from "@/components/ui/dataTable"; // Ensure DataTable supports bulk actions
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

import { TagFormData } from "@/lib/validators/tag";
import TagForm from "@/components/admin/TagForm";
import {
  fetchTagsForTable,
  addTag,
  updateTag,
  deleteTag,
  bulkDeleteTags,
  bulkGenerateSlugsForTags,
  TagForTable,
  ActionResponse,
} from "./_actions/tagActions";
import { createTagColumns } from "./columns";

function AdminTagsPageClientLoader() {
  return <p className="text-center py-10">Loading Tag manager...</p>;
}

export default function AdminTagsPageClient() {
  const [tags, setTags] = useState<TagForTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagForTable | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagForTable | null>(null);

  // Bulk delete confirmation state
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [tagsToBulkDelete, setTagsToBulkDelete] = useState<Row<TagForTable>[]>(
    [],
  );

  // DataTable state hooks - using sensible defaults
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true }, // Default sort by createdAt descending
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchTagsForTable();
      if (result.success && result.data) {
        setTags(result.data);
        setError(null);
      } else {
        setError(result.message || "Failed to load Tags.");
        toast.error(result.message || "Failed to load Tags.");
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
    loadTags();
  }, [loadTags]);

  // Modal handlers
  const handleOpenAddModal = useCallback(() => {
    setEditingTag(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((tag: TagForTable) => {
    setEditingTag(tag);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTag(null);
  }, []);

  const handleFormSubmit = async (data: TagFormData, id?: number) => {
    setIsSubmittingForm(true);

    const submissionPromise = id ? updateTag(id, data) : addTag(data);

    toast.promise(submissionPromise, {
      loading: id
        ? `Updating Tag "${data.name}"...`
        : `Adding Tag "${data.name}"...`,
      success: (result: ActionResponse<TagForTable>) => {
        if (result.success) {
          loadTags();
          handleCloseModal();
          return result.message || (id ? "Tag updated!" : "Tag added!");
        } else {
          // Construct error message for display within the success callback of toast.promise if non-throwing error
          let errorMsg = result.message || result.error || "An error occurred.";
          if (result.errors) {
            const fieldErrors = Object.entries(result.errors)
              .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
              .join("; ");
            errorMsg += ` Details: ${fieldErrors}`;
          }
          throw new Error(errorMsg); // Throw to trigger toast.promise error state
        }
      },
      error: (err: Error) => {
        // This catches errors thrown from the promise or from the success block
        return (
          err.message || (id ? "Failed to update Tag." : "Failed to add Tag.")
        );
      },
      finally: () => {
        setIsSubmittingForm(false);
      },
    });
  };

  // Delete handlers
  const handleDeleteRequest = useCallback((tag: TagForTable) => {
    setTagToDelete(tag);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = async () => {
    if (!tagToDelete) return;
    toast.promise(deleteTag(tagToDelete.id), {
      loading: `Deleting Tag "${tagToDelete.name}"...`,
      success: (result) => {
        loadTags();
        setShowDeleteDialog(false);
        setTagToDelete(null);
        return result.message || "Tag deleted successfully.";
      },
      error: (err) => {
        setShowDeleteDialog(false);
        return err.message || "Failed to delete Tag.";
      },
    });
  };

  // Bulk Action Handlers
  const handleBulkDeleteRequest = useCallback(
    (selectedRows: Row<TagForTable>[]) => {
      if (selectedRows.length === 0) {
        toast.info("No Tags selected for deletion.");
        return;
      }
      setTagsToBulkDelete(selectedRows);
      setShowBulkDeleteDialog(true);
    },
    [],
  );

  const confirmBulkDelete = useCallback(async () => {
    if (tagsToBulkDelete.length === 0) return;

    const ids = tagsToBulkDelete.map((row) => row.original.id);
    toast.promise(bulkDeleteTags(ids), {
      loading: `Deleting ${ids.length} Tag(s)...`,
      success: (result) => {
        loadTags();
        setShowBulkDeleteDialog(false);
        setTagsToBulkDelete([]);
        setRowSelection({}); // Clear selection
        return (
          result.message || `${result.count || ids.length} Tag(s) deleted.`
        );
      },
      error: (err) => {
        setShowBulkDeleteDialog(false);
        return err.message || "Failed to delete selected Tags.";
      },
    });
  }, [tagsToBulkDelete, loadTags]);

  const handleBulkGenerateSlugs = useCallback(
    async (selectedRows: Row<TagForTable>[]) => {
      if (selectedRows.length === 0) {
        toast.info("No Tags selected for slug generation.");
        return;
      }
      const ids = selectedRows.map((row) => row.original.id);
      toast.promise(bulkGenerateSlugsForTags(ids), {
        loading: `Generating slugs for ${ids.length} Tag(s)...`,
        success: (result) => {
          loadTags();
          setRowSelection({}); // Clear selection
          if (result.success) {
            return (
              result.message ||
              `${result.count || ids.length} slug(s) generated/updated.`
            );
          } else {
            // Handle partial success with errors shown in the message
            toast.error(result.error || "Some slugs could not be generated.");
            return (
              result.message || "Slug generation completed with some errors."
            );
          }
        },
        error: (err) => err.message || "Failed to generate slugs.",
      });
    },
    [loadTags],
  );

  const tagColumns = useMemo(
    () => createTagColumns(handleOpenEditModal, handleDeleteRequest),
    [handleOpenEditModal, handleDeleteRequest],
  );

  const bulkActions: BulkAction<TagForTable>[] = useMemo(
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
    setSorting([{ id: "createdAt", desc: true }]);
    setColumnFilters([]);
    setPagination({ pageIndex: 0, pageSize: 20 });
    setColumnVisibility({});
    setGlobalFilter("");
    setRowSelection({});
  }, []);

  if (isLoading && tags.length === 0) {
    return <AdminTagsPageClientLoader />;
  }

  if (error) {
    return <p className="text-center text-red-500 py-10">Error: {error}</p>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Tags</h1>
        <Button onClick={handleOpenAddModal}>
          <PlusIcon className="mr-2 h-4 w-4" /> Add Tag
        </Button>
      </div>

      <DataTable<TagForTable, unknown>
        columns={tagColumns as ColumnDef<TagForTable, unknown>[]}
        data={tags}
        filterColumnPlaceholder="Search by name, slug..."
        facetFilters={[]} // No facet filters for Tags for now, add if needed
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
      <Dialog
        open={isModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleCloseModal();
          else setIsModalOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit" : "Add New"} Tag</DialogTitle>
            {editingTag && (
              <DialogDescription>
                Editing: {editingTag.name} (ID: {editingTag.id})
              </DialogDescription>
            )}
          </DialogHeader>
          <TagForm
            key={editingTag ? `edit-${editingTag.id}` : "add"}
            initialData={
              editingTag
                ? {
                    ...editingTag,
                    description:
                      editingTag.description === null
                        ? undefined
                        : editingTag.description,
                  }
                : {}
            }
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmittingForm}
            onCancel={handleCloseModal}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (Single) */}
      {tagToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the Tag &quot;
                <strong>{tagToDelete.name}</strong>&quot; (ID: {tagToDelete.id}
                )? This action cannot be undone and might affect associated
                videos.
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
      {tagsToBulkDelete.length > 0 && (
        <AlertDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Bulk Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {tagsToBulkDelete.length}{" "}
                Tag(s)? This action cannot be undone and might affect associated
                videos.
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
                Delete {tagsToBulkDelete.length} Tag(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

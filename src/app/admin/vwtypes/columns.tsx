"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { deleteVWType, VWTypeForTable } from "./_actions/vwTypeActions";

import { Checkbox } from "@/components/ui/checkbox";

interface DeleteDialogProps {
  vwType: VWTypeForTable;
  onSuccess?: () => void;
}

export const columns = (
  handleOpenEditModal: (vwType: VWTypeForTable) => void,
  showDeleteDialog: (vwType: VWTypeForTable) => void,
): ColumnDef<VWTypeForTable>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        ID
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="w-[50px] font-mono text-xs">{row.getValue("id")}</div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const vwType = row.original;
      return (
        <Button
          variant="link"
          className="hover:underline font-medium p-0 h-auto text-current"
          onClick={() => handleOpenEditModal(vwType)}
        >
          {row.getValue("name")}
        </Button>
      );
    },
  },
  {
    accessorKey: "slug",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Slug
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-mono text-xs">{row.getValue("slug")}</div>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Description
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="max-w-xs truncate text-sm text-muted-foreground">
        {row.getValue("description") || "-"}
      </div>
    ),
  },
  {
    accessorKey: "videoCount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-center w-full justify-center"
      >
        Videos
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center w-full">
        <div className="text-center w-full">{row.original.videoCount}</div>
      </div>
    ),
  },
  {
    accessorKey: "sortOrder",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-center w-full justify-center"
      >
        Sort Order
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center w-full">{row.getValue("sortOrder")}</div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right pr-4">Actions</div>,
    cell: ({ row }) => {
      const vwType = row.original;

      return (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEditModal(vwType)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit VWType</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:text-red-700"
            onClick={() => showDeleteDialog(vwType)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete VWType</span>
          </Button>
        </div>
      );
    },
  },
];

export function DeleteVWTypeDialog({ vwType, onSuccess }: DeleteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    toast.promise(deleteVWType(vwType.id), {
      loading: `Deleting VWType "${vwType.name}"...`,
      success: (result) => {
        setIsOpen(false);
        onSuccess?.();
        return result.message;
      },
      error: (err) => {
        setIsOpen(false);
        return err.message || "Failed to delete VWType.";
      },
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete VWType?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the VWType &quot;
            <strong>{vwType.name}</strong>&quot; (ID: {vwType.id})? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsOpen(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

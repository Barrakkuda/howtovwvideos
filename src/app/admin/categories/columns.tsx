"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Category as PrismaCategory } from "@generated/prisma";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export type CategoryForTable = Pick<
  PrismaCategory,
  "id" | "name" | "description" | "slug" | "createdAt" | "updatedAt"
> & {
  videoCount: number;
};

export const getCategoryColumns = ({
  onEdit,
  onDelete,
}: {
  onEdit: (category: CategoryForTable) => void;
  onDelete: (category: CategoryForTable) => void;
}): ColumnDef<CategoryForTable>[] => [
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
    enableSorting: false,
    enableHiding: false,
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
      <div className="w-[80px] font-mono text-xs pl-1">
        {row.getValue("id")}
      </div>
    ),
    enableGlobalFilter: false,
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
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate font-medium">
        {row.getValue("name") as string}
      </div>
    ),
    enableGlobalFilter: true,
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => (
      <div className="font-mono text-xs">{row.getValue("slug")}</div>
    ),
    enableGlobalFilter: true,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string | null;
      return description ? (
        <div className="text-sm text-muted-foreground truncate max-w-[400px]">
          {description}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">None</span>
      );
    },
    enableGlobalFilter: true,
  },
  {
    accessorKey: "videoCount",
    header: ({ column }) => (
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Videos
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center tabular-nums">
        {row.getValue("videoCount")}
      </div>
    ),
    enableGlobalFilter: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created At
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as string | Date;
      const date = new Date(createdAt);
      const formatted = isNaN(date.getTime())
        ? "-"
        : date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
      return (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatted}
        </span>
      );
    },
    enableGlobalFilter: false,
  },
  {
    id: "actions",
    header: () => <div className="text-right pr-4">Actions</div>,
    cell: ({ row }) => {
      const category = row.original;
      return (
        <div className="flex items-center justify-end space-x-2 pr-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(category)}
            title="Edit Category"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => onDelete(category)}
            title="Delete Category"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

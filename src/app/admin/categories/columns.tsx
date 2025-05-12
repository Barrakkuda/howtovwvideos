"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Category } from "@generated/prisma";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define a type for the data expected by the table
export type CategoryEntry = Pick<
  Category,
  "id" | "name" | "description" | "createdAt" | "updatedAt"
>;

// Props for the cell actions, including handlers
interface CategoryCellActionProps {
  row: { original: CategoryEntry };
  onEdit: (category: CategoryEntry) => void;
  onDelete: (category: CategoryEntry) => void;
}

export const CategoryCellActions: React.FC<CategoryCellActionProps> = ({
  row,
  onEdit,
  onDelete,
}) => {
  const category = row.original;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(category)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(category)}
          className="text-red-600 hover:!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-700/50 focus:!bg-red-100 dark:focus:!bg-red-700/50 focus:!text-red-600 dark:focus:!text-red-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getCategoryColumns = (
  onEdit: (category: CategoryEntry) => void,
  onDelete: (category: CategoryEntry) => void,
): ColumnDef<CategoryEntry>[] => [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="pl-4 font-mono text-xs">{row.getValue("id")}</div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium text-base pl-2">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string | null;
      return description ? (
        <div className="text-sm text-muted-foreground truncate max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl">
          {description}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">None</span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created At
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="text-right tabular-nums text-sm text-muted-foreground">
        {new Date(row.getValue("createdAt")).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-center pr-4">Actions</div>,
    cell: ({ row }) => (
      <div className="text-center pr-2">
        <CategoryCellActions row={row} onEdit={onEdit} onDelete={onDelete} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

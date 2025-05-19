"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteVideo } from "./_actions/videoActions";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { VideoForTable } from "./_actions/videoTableActions";
import { Category } from "@generated/prisma";
import { formatVideoStatus } from "@/lib/utils/formatters";

export const columns: ColumnDef<VideoForTable>[] = [
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
      <div className="w-[80px] font-mono">{row.getValue("id")}</div>
    ),
  },
  {
    accessorKey: "videoId",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Platform Video ID
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="w-[120px] font-mono">{row.getValue("videoId")}</div>
    ),
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Title
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex space-x-2">
        <span className="max-w-[400px] truncate font-medium">
          <Link
            href={`/admin/videos/${row.original.id}/edit`}
            className="hover:underline"
          >
            {row.getValue("title")}
          </Link>
        </span>
      </div>
    ),
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => (
      <div className="font-mono text-xs">{row.getValue("slug")}</div>
    ),
  },
  {
    accessorKey: "categories",
    header: "Categories",
    cell: ({ row }) => {
      const categories = row.original.categories;
      if (!categories?.length) {
        return (
          <span className="text-neutral-500 dark:text-neutral-400">N/A</span>
        );
      }
      return (
        <div className="flex flex-wrap gap-1">
          {categories.map(({ category }: { category: Category }) => (
            <Badge
              key={category.id}
              variant="secondary"
              className="whitespace-nowrap"
            >
              {category.name}
            </Badge>
          ))}
        </div>
      );
    },
    filterFn: "arrIncludesSome",
  },
  {
    accessorKey: "vwTypes",
    header: "VW Type(s)",
    cell: ({ row }) => {
      const vwTypesRelation = row.original.vwTypes;
      if (!vwTypesRelation?.length) {
        return (
          <span className="text-neutral-500 dark:text-neutral-400">N/A</span>
        );
      }
      return (
        <div className="flex flex-wrap gap-1">
          {vwTypesRelation.map((item) => (
            <Badge
              key={item.vwType.id}
              variant="secondary"
              className="whitespace-nowrap"
            >
              {item.vwType.name}
            </Badge>
          ))}
        </div>
      );
    },
    filterFn: "arrIncludesSome",
  },
  {
    accessorKey: "popularityScore",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Popularity
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const score = row.getValue("popularityScore") as number | null;
      return (
        <div className="text-xs text-right tabular-nums w-[80px]">
          {score !== null && score !== undefined ? score.toFixed(2) : ""}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={status === "PUBLISHED" ? "default" : "secondary"}>
          {formatVideoStatus(status)}
        </Badge>
      );
    },
    filterFn: "arrIncludesSome",
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
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground tabular-nums">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right pr-4">Actions</div>,
    cell: ({ row }) => {
      const video = row.original;

      return (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/videos/${video.id}/edit`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit Video</span>
            </Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete Video</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Video?</AlertDialogTitle>
                <AlertDialogDescription>
                  Title: &quot;<strong>{video.title}</strong>&quot;
                  <br /> This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    const result = await deleteVideo(video.id as number);
                    if (result.success) {
                      toast.success(result.message);
                    } else {
                      toast.error(result.message);
                    }
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];

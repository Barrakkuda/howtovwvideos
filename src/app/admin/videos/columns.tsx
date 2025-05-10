"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Define the shape of our video data, including the nested category
// This should match the data structure you fetch from Prisma
export type VideoEntry = {
  id: number; // Or string, depending on your Prisma schema for Video.id
  videoId: string | null;
  title: string;
  url: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; // Match your VideoStatus enum
  categories: Array<{
    // This represents an entry from the CategoriesOnVideos join table
    category: {
      id: number;
      name: string;
    };
    // You can also include other fields from CategoriesOnVideos if needed, like assignedAt
  }>;
  // Add any other fields you might display or use for actions
  createdAt: Date;
};

export const columns: ColumnDef<VideoEntry>[] = [
  // Optional: If you want to display the internal ID and make it sortable
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          DB ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "videoId",
    header: "Platform ID",
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "categories", // Changed from category.name
    header: "Categories", // Changed header to plural
    cell: ({ row }) => {
      const categoriesOnVideo = row.original.categories;
      if (!categoriesOnVideo || categoriesOnVideo.length === 0) {
        return <span className="text-xs text-muted-foreground">N/A</span>;
      }
      const categoryNames = categoriesOnVideo
        .map((cov) => cov.category.name)
        .join(", ");
      return <span className="text-xs">{categoryNames}</span>;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as VideoEntry["status"];
      let statusClass = "";
      switch (status) {
        case "PUBLISHED":
          statusClass =
            "bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100";
          break;
        case "DRAFT":
          statusClass =
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100";
          break;
        case "ARCHIVED":
          statusClass =
            "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100";
          break;
        default:
          statusClass = "bg-gray-200 text-gray-700";
      }
      return (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) => {
      const url = row.getValue("url") as string;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
        >
          Link
        </a>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <div className="text-sm">{date.toLocaleDateString()}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const video = row.original;

      return (
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/admin/videos/${video.id}/edit`} passHref>
                <DropdownMenuItem>Edit</DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-red-600 hover:!text-red-700 focus:!text-red-700 focus:!bg-red-50 dark:focus:!bg-red-700/20"
                  onSelect={(e) => e.preventDefault()}
                >
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  const result = await deleteVideo(video.id);
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
      );
    },
  },
];

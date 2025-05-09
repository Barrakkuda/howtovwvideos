"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

// Define the shape of our video data, including the nested category
// This should match the data structure you fetch from Prisma
export type VideoEntry = {
  id: number; // Or string, depending on your Prisma schema for Video.id
  videoId: string | null;
  title: string;
  url: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; // Match your VideoStatus enum
  category: {
    name: string;
  };
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
    accessorKey: "category.name", // Access nested data
    header: "Category",
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(video.id.toString())}
            >
              Copy Video DB ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Link href={`/admin/videos/edit/${video.id}`} passHref>
              <DropdownMenuItem>Edit Video</DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              onClick={() => console.log("Delete video:", video.id)}
              className="text-red-600 hover:!text-red-700"
            >
              Delete Video
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

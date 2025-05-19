"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Channel } from "@generated/prisma";
import { formatNumber } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { ChannelForm } from "./ChannelForm";
import { deleteChannel } from "./_actions/channelActions";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

// Channel Actions Cell Component
function ChannelActionsCell({ channel }: { channel: Channel }) {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className="flex items-center justify-end space-x-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowEditModal(true)}
        title="Edit Channel"
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit Channel</span>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:text-red-700"
            title="Delete Channel"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete Channel</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Channel?</AlertDialogTitle>
            <AlertDialogDescription>
              Channel: &quot;<strong>{channel.name}</strong>&quot;
              <br /> This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const result = await deleteChannel(channel.id);
                if (result.success) {
                  toast.success("Channel deleted successfully");
                } else {
                  toast.error(result.message || "Failed to delete channel");
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChannelForm
        channel={channel}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />
    </div>
  );
}

export const columns: ColumnDef<Channel>[] = [
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
      <div className="w-[80px] font-mono text-xs pl-1">
        {row.getValue("id")}
      </div>
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
      const channel = row.original;
      return (
        <div className="flex items-center gap-2">
          {channel.thumbnailUrl && (
            <Image
              src={channel.thumbnailUrl}
              alt={channel.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div>
            <div className="font-medium">{channel.name}</div>
            <div className="text-sm text-gray-500">
              {formatNumber(channel.subscriberCount || 0)} subscribers
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "platformChannelId",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Platform ID
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "videoCount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Videos
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {formatNumber(row.original.videoCount || 0)}
      </div>
    ),
  },
  {
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) => (
      <a
        href={row.original.url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        View Channel
      </a>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right pr-4">Actions</div>,
    cell: ({ row }) => <ChannelActionsCell channel={row.original} />,
  },
];

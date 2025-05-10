import Link from "next/link";
import { prisma } from "@/lib/db";
import { DataTable } from "@/components/ui/data-table";
import { columns, VideoEntry } from "./columns";
import { Button as ShadcnButton } from "@/components/ui/button";

export default async function AdminVideosPage() {
  const videosFromDb = await prisma.video.findMany({
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedVideos: VideoEntry[] = videosFromDb.map((video) => ({
    ...video,
  }));

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
          Manage Videos
        </h1>
        <Link href="/admin/videos/new">
          <ShadcnButton>Add New Video</ShadcnButton>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={formattedVideos}
        filterColumnId="title"
        filterColumnPlaceholder="Filter videos by title..."
      />
    </>
  );
}

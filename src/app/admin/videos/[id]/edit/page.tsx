console.log("Executing src/app/admin/videos/[id]/edit/page.tsx"); // Top-level log
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import EditVideoFormWrapper from "@/components/admin/EditVideoFormWrapper";
import { Metadata } from "next";

interface EditVideoPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Edit Video",
};

export default async function EditVideoPage({ params }: EditVideoPageProps) {
  const id = parseInt((await params).id, 10);

  if (isNaN(id)) {
    notFound();
  }

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!video) {
    notFound();
  }

  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });

  // The VideoStatus enum needs to be passed if it's used directly in the form component
  // For now, VideoForm handles it internally based on initialData.status

  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">
        Edit Video: <span className="font-normal">{video.title}</span>
      </h1>
      <EditVideoFormWrapper video={video} categories={categories} />
    </>
  );
}

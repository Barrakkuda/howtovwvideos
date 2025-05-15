import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import EditVideoFormWrapper from "@/components/admin/EditVideoFormWrapper";
import { Metadata } from "next";
import { fetchNavigationVWTypes } from "@/app/vwtypes/_actions/vwTypeActions";

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

  const [video, categoriesData, vwTypesResult] = await Promise.all([
    prisma.video.findUnique({
      where: { id },
      include: {
        categories: {
          include: { category: true },
        },
        vwTypes: {
          include: { vwType: true },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
    fetchNavigationVWTypes(),
  ]);

  if (!video) {
    notFound();
  }

  const availableVwTypes = vwTypesResult.success
    ? vwTypesResult.data || []
    : [];
  if (!vwTypesResult.success) {
    console.warn(
      "EditVideoPage: Failed to fetch VW Types for form options:",
      vwTypesResult.error,
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">
        Edit Video: <span className="font-normal">{video.title}</span>
      </h1>
      <EditVideoFormWrapper
        video={video}
        categories={categoriesData}
        availableVwTypes={availableVwTypes}
      />
    </>
  );
}

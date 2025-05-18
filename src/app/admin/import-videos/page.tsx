import YouTubeImportForm from "@/components/admin/YouTubeImportForm";
import { prisma } from "@/lib/db";
import BatchImportSection from "@/components/admin/BatchImportSection";
import { Metadata } from "next";

// Metadata
export const metadata: Metadata = {
  title: `Import Videos | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
  description: "Import Videos",
};

export default async function YouTubeImportPage() {
  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Import Videos from YouTube
        </h1>
      </div>

      {/* Batch Import Section */}
      <BatchImportSection />

      {/* Manual Import Section */}
      <YouTubeImportForm categories={categories} />
    </>
  );
}

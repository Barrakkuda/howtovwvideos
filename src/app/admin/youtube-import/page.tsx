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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Import Videos from YouTube</h1>
      </div>

      {/* Batch Import Section */}
      <BatchImportSection />

      {/* Manual Import Section */}
      <YouTubeImportForm categories={categories} />
    </>
  );
}

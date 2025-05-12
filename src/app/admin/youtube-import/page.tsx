import YouTubeImportForm from "@/components/admin/YouTubeImportForm";
import { prisma } from "@/lib/db";
import BatchImportSection from "@/components/admin/BatchImportSection";

export const metadata = {
  title: "Import YouTube Videos",
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

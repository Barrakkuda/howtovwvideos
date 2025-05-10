import YouTubeImportForm from "@/components/admin/YouTubeImportForm";
import { prisma } from "@/lib/db";
import { Category } from "@generated/prisma";

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
      {/* 
        We will fetch the API key on the server and pass it to the client component,
        or the server action will use it directly.
        For now, the form will just handle UI and call the action.
      */}
      <YouTubeImportForm categories={categories} />
    </>
  );
}

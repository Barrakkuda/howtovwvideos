import { prisma } from "@/lib/db";
import NewVideoFormWrapper from "@/components/admin/NewVideoFormWrapper"; // We will create this

export default async function NewVideoPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Add New Video
        </h1>
        <p className="text-muted-foreground">
          Fill in the details below to add a new video.
        </p>
      </div>
      <NewVideoFormWrapper categories={categories} />
    </div>
  );
}

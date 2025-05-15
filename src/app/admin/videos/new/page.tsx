import { prisma } from "@/lib/db";
import NewVideoFormWrapper from "@/components/admin/NewVideoFormWrapper";
import { fetchNavigationVWTypes } from "@/app/vwtypes/_actions/vwTypeActions";

export default async function NewVideoPage() {
  const [categories, vwTypesResult] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
    fetchNavigationVWTypes(),
  ]);

  const availableVwTypes = vwTypesResult.success
    ? vwTypesResult.data || []
    : [];
  if (!vwTypesResult.success) {
    console.warn(
      "NewVideoPage: Failed to fetch VW Types:",
      vwTypesResult.error,
    );
  }

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
      <NewVideoFormWrapper
        categories={categories}
        availableVwTypes={availableVwTypes}
      />
    </div>
  );
}

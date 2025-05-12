import { prisma } from "@/lib/db";

export default async function AdminDashboardPage() {
  const videoCount = await prisma.video.count();
  const categoryCount = await prisma.category.count();

  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-card-foreground">
            Total Videos
          </h2>
          <p className="text-3xl font-bold text-card-foreground">
            {videoCount}
          </p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-card-foreground">
            Total Categories
          </h2>
          <p className="text-3xl font-bold text-card-foreground">
            {categoryCount}
          </p>
        </div>
      </div>
    </>
  );
}

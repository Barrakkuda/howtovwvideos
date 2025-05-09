import { prisma } from "../../../lib/db"; // Adjust path if your src directory is elsewhere

export default async function AdminDashboardPage() {
  const videoCount = await prisma.video.count();
  const categoryCount = await prisma.category.count();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
        Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder for stats cards */}
        <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
            Total Videos
          </h2>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {videoCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
            Total Categories
          </h2>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {categoryCount}
          </p>
        </div>
        {/* Add more stats cards or widgets here */}
      </div>
    </div>
  );
}

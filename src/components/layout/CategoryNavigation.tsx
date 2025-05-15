import Link from "next/link";
import { fetchPublicCategories } from "@/app/admin/categories/_actions/categoryActions"; // Adjust path as necessary
import { List } from "lucide-react";

export default async function CategoryNavigation() {
  const result = await fetchPublicCategories();
  // console.log(
  //   "[CategoryNavigation] Fetched categories result:",
  //   // JSON.stringify(result, null, 2),
  // );

  if (!result.success || !result.data || result.data.length === 0) {
    console.log(
      "[CategoryNavigation] No categories to display or fetch error.",
    );
    if (!result.success) {
      console.error(
        "[CategoryNavigation] Error fetching categories:",
        result.error,
      );
    }
    return null;
  }

  const categories = result.data;
  const categoriesWithSlugs = categories.filter(
    (category) => category.slug !== null,
  );

  if (categoriesWithSlugs.length === 0) {
    console.log("[CategoryNavigation] All fetched categories lack slugs.");
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-3 text-neutral-800 dark:text-neutral-100 flex items-center">
        <List className="mr-2 h-5 w-5" /> Categories
      </h3>
      <nav>
        <ul className="space-y-1">
          {categoriesWithSlugs.map((category) => {
            return (
              <li key={category.id}>
                <Link
                  href={`/category/${category.slug}`}
                  className="block text-sm text-neutral-600 hover:text-blue-600 dark:text-neutral-300 dark:hover:text-blue-400 transition-colors py-1 px-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  {category.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

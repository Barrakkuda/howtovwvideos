import Link from "next/link";
import {
  getAllCategories,
  CategoryBasicInfo,
} from "@/app/_actions/categoryActions";

export default async function CategoryGrid() {
  const categories: CategoryBasicInfo[] = await getAllCategories();

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="pb-8 md:pb-12 mb-10">
      <div className="container mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-neutral-800 dark:text-neutral-100">
          Explore Categories
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link
              href={`/category/${category.slug}`}
              key={category.id}
              className="block p-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:shadow-md transition-all duration-200 ease-in-out text-center transform hover:-translate-y-1"
            >
              <h3 className="text-md font-semibold text-neutral-700 dark:text-neutral-200 group-hover:text-blue-600">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

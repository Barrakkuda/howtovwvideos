import Link from "next/link";
import { TagsIcon } from "lucide-react";
import {
  fetchNavigationTags,
  NavigationTag,
} from "@/app/(public)/tag/_actions/tagActions";

export default async function PopularTags() {
  const result = await fetchNavigationTags(25);

  if (!result.success || !result.data || result.data.length === 0) {
    let errorMessage = "No tags available at the moment.";
    if (!result.success && result.error) {
      console.error("Error fetching popular tags:", result.error);
      errorMessage = "Could not load tags.";
    }
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-neutral-800 dark:text-neutral-100 flex items-center">
          <TagsIcon className="mr-2 h-5 w-5" /> Popular Tags
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {errorMessage}
        </p>
      </div>
    );
  }

  const tags: NavigationTag[] = result.data;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-100 flex items-center">
        <TagsIcon className="mr-2 h-5 w-5" /> Popular Tags
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${tag.slug}`}
            className="block text-sm text-neutral-600 hover:text-blue-600 dark:text-neutral-300 dark:hover:text-blue-400 transition-colors py-1 px-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            {tag.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

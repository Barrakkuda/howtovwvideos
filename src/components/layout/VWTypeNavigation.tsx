import Link from "next/link";
import { fetchNavigationVWTypes } from "@/app/admin/vwtypes/_actions/vwTypeActions"; // Adjust path as necessary

export default async function VWTypeNavigation() {
  const result = await fetchNavigationVWTypes();

  if (!result.success || !result.data || result.data.length === 0) {
    // console.error("VWTypeNavigation:", result.error || "No VW Types found for navigation");
    return null; // Or render a placeholder/message
  }

  const vwTypeLinks = result.data;

  return (
    <nav className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 sm:gap-x-4 order-last sm:order-none w-full sm:w-auto mt-4 sm:mt-0">
      {vwTypeLinks.map((item) => (
        <Link
          key={item.id} // Use id from DB as key
          href={`/type/${item.slug}`} // Use slug from DB
          className="text-sm hover:text-blue-300 transition-colors px-1 py-1 sm:px-2"
        >
          {item.name} {/* Use name from DB for label */}
        </Link>
      ))}
    </nav>
  );
}

import Link from "next/link";
import { fetchNavigationVWTypes } from "@/app/admin/vwtypes/_actions/vwTypeActions";

export default async function VWTypeNavigation() {
  const result = await fetchNavigationVWTypes();

  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }

  const vwTypeLinks = result.data;

  return (
    <nav className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 sm:gap-x-4 order-last sm:order-none w-full sm:w-auto">
      {vwTypeLinks.map((item) => (
        <Link
          key={item.id}
          href={`/type/${item.slug}`}
          className="text-sm hover:text-blue-300 transition-colors px-1 py-1 sm:px-2"
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}

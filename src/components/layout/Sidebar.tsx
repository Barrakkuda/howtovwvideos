import CategoryNavigation from "./CategoryNavigation";
import PopularTags from "./PopularTags";
import SidebarBackButton from "./SidebarBackButton";

export default function Sidebar() {
  return (
    <aside className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg shadow-md w-full md:w-64 lg:w-72 space-y-6">
      <SidebarBackButton />
      <CategoryNavigation />
      <PopularTags />
    </aside>
  );
}

import Link from "next/link";

export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground p-4 space-y-4">
      <div className="text-2xl font-bold mb-8">Video Admin</div>
      <nav>
        <ul>
          <li>
            <Link
              href="/admin/dashboard"
              className="block py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/admin/videos"
              className="block py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              Videos
            </Link>
          </li>
          <li>
            <Link
              href="/admin/categories"
              className="block py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              Categories
            </Link>
          </li>
          {/* Add more navigation links as needed */}
        </ul>
      </nav>
    </aside>
  );
}

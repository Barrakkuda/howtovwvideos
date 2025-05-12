import Link from "next/link";
import { LayoutDashboard, Film, Tags, SquarePlay } from "lucide-react";

export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground p-4 space-y-4">
      <div className="text-2xl font-bold mb-8">Video Admin</div>
      <nav>
        <ul>
          <li>
            <Link
              href="/admin/dashboard"
              className="flex items-center space-x-2 py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/videos"
              className="flex items-center space-x-2 py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              <Film className="h-5 w-5" />
              <span>Videos</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/categories"
              className="flex items-center space-x-2 py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              <Tags className="h-5 w-5" />
              <span>Categories</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/youtube-import"
              className="flex items-center space-x-2 py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              <SquarePlay className="h-5 w-5" />
              <span>Import YouTube</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

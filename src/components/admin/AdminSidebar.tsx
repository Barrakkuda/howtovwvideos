import Link from "next/link";
import {
  LayoutDashboard,
  Film,
  Tags,
  SquarePlay,
  Car,
  Wrench,
  Tag,
  Search,
  Video,
} from "lucide-react";

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
              href="/admin/vwtypes"
              className="flex items-center space-x-2 py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              <Car className="h-5 w-5" />
              <span>VW Types</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/tags"
              className="flex items-center space-x-2 py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              <Tag className="h-5 w-5" />
              <span>Tags</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/channels"
              className="flex items-center space-x-2 py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              <Video className="h-5 w-5" />
              <span>Channels</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/searches"
              className="flex items-center space-x-2 py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              <Search className="h-5 w-5" />
              <span>Search Logs</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/import-videos"
              className="flex items-center space-x-2 py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              <SquarePlay className="h-5 w-5" />
              <span>Import Videos</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/maintenance"
              className="flex items-center space-x-2 py-2 px-3 rounded hover:bg-sidebar-accent"
            >
              <Wrench className="h-5 w-5" />
              <span>Maintenance</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        <main className="flex-1 overflow-y-auto p-10">{children}</main>
      </div>
    </div>
  );
}

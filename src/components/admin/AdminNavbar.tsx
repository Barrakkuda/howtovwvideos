export default function AdminNavbar() {
  return (
    <header className="bg-sidebar shadow-md px-10 py-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-sidebar-foreground">
          Admin Panel
        </h1>
        <div>
          <span className="text-muted-foreground">User Profile</span>
        </div>
      </div>
    </header>
  );
}

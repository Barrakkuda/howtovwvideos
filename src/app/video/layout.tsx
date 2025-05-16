import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function VideoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            <Sidebar />
          </div>
          <div className="md:col-span-8 lg:col-span-9">{children}</div>
        </div>
      </main>
      <footer className="bg-neutral-100 dark:bg-neutral-800 text-center p-4 text-sm text-neutral-600 dark:text-neutral-400">
        <p>
          &copy; {new Date().getFullYear()} How-To VW Videos. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}

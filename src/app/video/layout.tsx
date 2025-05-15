import Header from "@/components/layout/Header";

export default function VideoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <Header />
      <main className="flex-grow">{children}</main>
      <footer className="bg-neutral-100 dark:bg-neutral-800 text-center p-4 text-sm text-neutral-600 dark:text-neutral-400">
        <p>
          &copy; {new Date().getFullYear()} How-To VW Videos. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}

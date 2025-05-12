// import Link from 'next/link'; // No longer directly used here
import Header from "@/components/layout/Header"; // Import the new Header component
import VideoGrid from "@/components/video/VideoGrid"; // Import the new VideoGrid component
import TagsSidebar from "@/components/layout/TagsSidebar"; // Import TagsSidebar
// import Image from "next/image"; // Keep if used by actual components later -- Removing for now

// TODO: Define or import these placeholder components
// const SiteHeader = () => ( ... ) // Remove inline SiteHeader placeholder

interface HomePageProps {
  searchParams: Promise<{ page?: string }>;
}

// Make Home an async component to await VideoGrid (which fetches data)
export default async function Home({ searchParams }: HomePageProps) {
  const searchParamsValues = await searchParams;
  const currentPage = searchParamsValues?.page
    ? parseInt(searchParamsValues.page, 10)
    : 1;
  if (isNaN(currentPage) || currentPage < 1) {
    // Handle invalid page number, perhaps redirect or default to 1
    // For now, defaulting to 1 if parsing fails or it's out of bounds.
    // Consider redirecting to a clean URL if `page` is invalid.
    // redirect("/?page=1"); // Example, would require `redirect` from `next/navigation`
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          <div className="md:col-span-8 lg:col-span-9">
            <VideoGrid currentPage={currentPage > 0 ? currentPage : 1} />
          </div>
          <div className="md:col-span-4 lg:col-span-3">
            <TagsSidebar />
          </div>
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

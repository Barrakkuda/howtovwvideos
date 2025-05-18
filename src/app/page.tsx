import Header from "@/components/layout/Header";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import HeroCarousel from "@/components/layout/HeroCarousel";
import { VideoCarousel } from "@/components/video/VideoCarousel";
import {
  getRecentPopularVideos,
  getRecentlyPublishedVideos,
} from "@/app/_actions/videoFeedActions";
import CategoryGrid from "@/components/category/CategoryGrid";

interface HomePageProps {
  searchParams: Promise<{ page?: string }>;
}

// Metadata
export const metadata: Metadata = {
  title: `How-To VW Videos | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
  description:
    "Discover a comprehensive collection of how-to videos dedicated to aircooled Volkswagen vehicles. Whether you're a seasoned VW enthusiast or a new owner, find awesome video tutorials to help you understand, maintain, and customize your VW.",
};

export default async function Home({ searchParams }: HomePageProps) {
  const searchParamsValues = await searchParams;
  const currentPage = searchParamsValues?.page
    ? parseInt(searchParamsValues.page, 10)
    : 1;
  if (isNaN(currentPage) || currentPage < 1) {
    redirect("/?page=1");
  }

  const recentPopularVideos = await getRecentPopularVideos();
  const recentlyPublishedVideos = await getRecentlyPublishedVideos();

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100">
      <Header />
      <HeroCarousel />

      <section className="md:py-12 md:mt-[-100px] z-15">
        {/* Recently Popular Videos Carousel Section */}
        {recentPopularVideos && recentPopularVideos.length > 0 && (
          <div className="container mx-auto">
            <VideoCarousel
              videos={recentPopularVideos}
              title="Popular Videos This Week"
              itemsPerPageMap={{ base: 1, sm: 2, md: 3, lg: 4, xl: 4 }}
            />
          </div>
        )}

        {/* Recently Published Videos Carousel Section */}
        {recentlyPublishedVideos && recentlyPublishedVideos.length > 0 && (
          <div className="container mx-auto">
            <VideoCarousel
              videos={recentlyPublishedVideos}
              title="Recently Published Videos"
              itemsPerPageMap={{ base: 1, sm: 2, md: 3, lg: 4, xl: 4 }}
            />
          </div>
        )}
      </section>

      <CategoryGrid />

      {/* <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <HomePageSearch />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            <Sidebar />
          </div>
          <div className="md:col-span-8 lg:col-span-9">
            <VideoGrid currentPage={currentPage > 0 ? currentPage : 1} />
          </div>
        </div>
      </main> */}

      <footer className="bg-neutral-100 dark:bg-neutral-800 text-center p-4 text-sm text-neutral-600 dark:text-neutral-400">
        <p>
          &copy; {new Date().getFullYear()} How-To VW Videos. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}

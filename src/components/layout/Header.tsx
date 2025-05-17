import Link from "next/link";
import SearchBar from "@/components/forms/SearchBar";
import VWTypeNavigation from "@/components/layout/VWTypeNavigation";
import { Suspense } from "react";

// Corresponds to VWType enum in Prisma, excluding 'ALL'
// We might fetch this dynamically or sync it, but for now, manual for nav links.

export default async function Header() {
  return (
    <header className="bg-neutral-800 text-neutral-100 p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold shrink-0">
          <Link href="/" className="hover:text-blue-400 transition-colors">
            {process.env.NEXT_PUBLIC_SITE_NAME}
          </Link>
        </h1>
        <VWTypeNavigation />
        <div className="w-full sm:w-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
          <Suspense fallback={<div>Loading search...</div>}>
            <SearchBar />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

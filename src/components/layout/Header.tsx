"use client";

import Link from "next/link";
import SearchBar from "@/components/forms/SearchBar";

// Corresponds to VWType enum in Prisma, excluding 'ALL'
// We might fetch this dynamically or sync it, but for now, manual for nav links.
export const vwTypeNavigationLinks = [
  { value: "BEETLE", label: "Beetle" },
  { value: "GHIA", label: "Ghia" },
  { value: "THING", label: "Thing" },
  { value: "BUS", label: "Bus" },
  { value: "OFF_ROAD", label: "Off-Road" },
  { value: "TYPE3", label: "Type 3" },
  { value: "TYPE4", label: "Type 4" },
];

export default function Header() {
  return (
    <header className="bg-neutral-800 text-neutral-100 p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold shrink-0">
          <Link href="/" className="hover:text-blue-400 transition-colors">
            How-To VW Videos
          </Link>
        </h1>
        <nav className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 sm:gap-x-4 order-last sm:order-none w-full sm:w-auto mt-4 sm:mt-0">
          {vwTypeNavigationLinks.map((item) => (
            <Link
              key={item.value}
              href={`/video/type/${item.value.toLowerCase()}`}
              className="text-sm hover:text-blue-300 transition-colors px-1 py-1 sm:px-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="w-full sm:w-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}

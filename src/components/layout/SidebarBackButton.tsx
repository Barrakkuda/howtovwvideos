"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SidebarBackButton() {
  const pathname = usePathname();
  const showBackButton = pathname.startsWith("/video/");

  if (!showBackButton) {
    return null;
  }

  return (
    <div className="mb-6">
      <Button asChild variant="outline" className="w-full justify-start">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Videos
        </Link>
      </Button>
    </div>
  );
}

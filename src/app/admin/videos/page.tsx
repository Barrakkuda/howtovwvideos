import { Metadata } from "next";
import { Suspense } from "react";
import AdminVideosPageClient from "./VideosClient";

// Metadata
export const metadata: Metadata = {
  title: `Videos | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
  description: "Videos",
};

function AdminVideosPageClientLoader() {
  return <p className="text-center py-10">Loading videos manager...</p>;
}

export default function AdminVideosPage() {
  return (
    <Suspense fallback={<AdminVideosPageClientLoader />}>
      <AdminVideosPageClient />
    </Suspense>
  );
}

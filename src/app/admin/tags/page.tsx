import { Suspense } from "react";
import { Metadata } from "next";
import AdminTagsPageClient from "./TagsClient";

function AdminTagsPageClientLoader() {
  return <p className="text-center py-10">Loading Tag manager...</p>;
}

// Metadata
export const metadata: Metadata = {
  title: `Tags | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
  description: "Tags",
};

export default function AdminTagsPage() {
  return (
    <Suspense fallback={<AdminTagsPageClientLoader />}>
      <AdminTagsPageClient />
    </Suspense>
  );
}

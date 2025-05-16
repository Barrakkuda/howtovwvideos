import { Suspense } from "react";
import { Metadata } from "next";
import AdminCategoriesPageClient from "./CategoriesClient";

// Metadata
export const metadata: Metadata = {
  title: `Categories | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
  description: "Categories",
};

function AdminCategoriesPageServerLoader() {
  return <p className="text-center py-10">Loading categories manager...</p>;
}

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<AdminCategoriesPageServerLoader />}>
      <AdminCategoriesPageClient />
    </Suspense>
  );
}

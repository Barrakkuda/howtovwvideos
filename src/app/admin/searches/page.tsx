import { Suspense } from "react";
import { Metadata } from "next";
import AdminSearchLogsPageClient from "./SearchesClient";

// Metadata
export const metadata: Metadata = {
  title: `Search Logs | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
  description: "Search Logs",
};

function AdminSearchLogsPageClientLoader() {
  return <p className="text-center py-10">Loading search logs...</p>;
}

export default function AdminSearchLogsPage() {
  return (
    <Suspense fallback={<AdminSearchLogsPageClientLoader />}>
      <AdminSearchLogsPageClient />
    </Suspense>
  );
}

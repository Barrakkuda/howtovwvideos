import { Suspense } from "react";
import { Metadata } from "next";
import AdminVWTypesPageClient from "./VWTypesClient";

// Metadata
export const metadata: Metadata = {
  title: `VW Types | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
  description: "VW Types",
};

function AdminVWTypesPageClientLoader() {
  return <p className="text-center py-10">Loading VW Type manager...</p>;
}

export default function AdminVWTypesPage() {
  return (
    <Suspense fallback={<AdminVWTypesPageClientLoader />}>
      <AdminVWTypesPageClient />
    </Suspense>
  );
}

import { Suspense } from "react";
import { Metadata } from "next";
import AdminMaintenancePageClient from "./MaintenanceClient";

// Metadata
export const metadata: Metadata = {
  title: `Maintenance | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
  description: "Maintenance",
};

function AdminMaintenancePageClientLoader() {
  return <p className="text-center py-10">Loading maintenance page...</p>;
}

export default function AdminMaintenancePage() {
  return (
    <Suspense fallback={<AdminMaintenancePageClientLoader />}>
      <AdminMaintenancePageClient />
    </Suspense>
  );
}

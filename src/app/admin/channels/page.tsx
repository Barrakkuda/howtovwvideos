import { Suspense } from "react";
import { Metadata } from "next";
import { ChannelsClient } from "./ChannelsClient";

// Metadata
export const metadata: Metadata = {
  title: `Channels | ${process.env.NEXT_PUBLIC_SITE_NAME}`,
  description: "Manage YouTube Channels",
};

function AdminChannelsPageClientLoader() {
  return <p className="text-center py-10">Loading Channel manager...</p>;
}

export default function AdminChannelsPage() {
  return (
    <Suspense fallback={<AdminChannelsPageClientLoader />}>
      <ChannelsClient />
    </Suspense>
  );
}

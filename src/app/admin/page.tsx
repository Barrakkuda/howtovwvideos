import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/dashboard");
  // This return is technically unreachable but good practice for components
  return null;
}

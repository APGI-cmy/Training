import { requireAdmin } from "@/lib/auth/require-admin";
import { redirect } from "next/navigation";
export default async function OrganisationsPage() {
  await requireAdmin();
  redirect("/admin/companies");
}

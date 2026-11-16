import { redirect } from "next/navigation";
import { getPortalEntryDestination } from "@/lib/auth/post-sign-in-destination";
import { getCurrentSession, getUserRoles } from "@/server/auth/session";

export default async function HomePage() {
  const session = await getCurrentSession();
  const roles = session ? await getUserRoles(session.accessToken) : null;

  redirect(getPortalEntryDestination(roles));
}

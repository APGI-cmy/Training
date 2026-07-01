import { LearnerDashboard } from "@/components/dashboard/LearnerDashboard";
import { requireSession } from "@/server/auth/session";
import { getDashboard } from "@/lib/services/dashboard/get-dashboard";

export const metadata = {
  title: "Learner dashboard"
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const dashboard = await getDashboard(session);

  return <LearnerDashboard dashboard={dashboard} />;
}

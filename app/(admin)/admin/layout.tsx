import type { ReactNode } from "react";
import { LearnerSidebar } from "@/components/navigation/LearnerSidebar";
import { requireAdmin } from "@/lib/auth/require-admin";
import "../../navigation-shell.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="learner-shell">
      <LearnerSidebar />
      <div className="learner-content">{children}</div>
    </div>
  );
}

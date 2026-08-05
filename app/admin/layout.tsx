import type { ReactNode } from "react";
import { LearnerSidebar } from "@/components/navigation/LearnerSidebar";
import { requireRole } from "@/server/auth/session";
import "../navigation-shell.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["admin"]);
  return (
    <div className="learner-shell">
      <LearnerSidebar />
      <div className="learner-content">{children}</div>
    </div>
  );
}

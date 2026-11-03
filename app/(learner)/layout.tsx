import {SecurityAssuranceNotice} from "@/components/security-watchdog/SecurityAssuranceNotice";
import type { ReactNode } from "react";
import { LearnerSidebar } from "@/components/navigation/LearnerSidebar";
import "../navigation-shell.css";

export default function LearnerLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="learner-shell">
      <LearnerSidebar /><SecurityAssuranceNotice/>
      <div className="learner-content">{children}</div>
    </div>
  );
}

import type { ReactNode } from "react";
import { requireSession } from "@/server/auth/session";
import { requireLearnerProfile } from "@/server/auth/learner-onboarding";

export default async function LearningLayout({ children }: { children: ReactNode }) {
  await requireLearnerProfile(await requireSession());
  return children;
}

import type { ReactNode } from "react";
import { getViewerSessionStatus } from "@/lib/services/viewer-lab/get-viewer-session-status";
import { ViewerSessionGate } from "./ViewerSessionGate";

export async function ViewerUnitAccess({ userId, courseSlug, unitSlug, children }: {
  userId: string; courseSlug: string; unitSlug: string; children: ReactNode;
}) {
  if (courseSlug !== "scannex-training-programme") return children;
  const status = await getViewerSessionStatus(userId, unitSlug);
  return <ViewerSessionGate courseSlug={courseSlug} unitSlug={unitSlug} initialStatus={status}>
    {status.canProceed ? children : null}
  </ViewerSessionGate>;
}

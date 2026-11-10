import "server-only";
import type { ViewerSessionStatus } from "./viewer-session-policy";

export async function getViewerSessionStatus(userId: string, targetUnitSlug: string): Promise<ViewerSessionStatus> {
  // Owner direction, 10 November 2026: keeping Viewer open cannot block an LU.
  // Preserve the endpoint for already-open old tabs. Its route still checks
  // authentication and active enrolment before returning this decision.
  return {
    status: "retained", canProceed: true,
    message: "You can return to any learning unit while your Viewer remains open. Resume your last saved activity from course progress."
  };
}

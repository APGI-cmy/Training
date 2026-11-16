import "server-only";
import { adminRest } from "@/server/supabase/admin-rest";
import { hasRunningViewerSession } from "./describe-viewer-sessions";
import { getViewerLabConfig } from "./viewer-lab-config";
import { getViewerLabSettings } from "./viewer-lab-settings";
import { canRetainViewerSession, viewerSessionCheckUnavailable, viewerSessionProgressionStatus, type ViewerSessionStatus } from "./viewer-session-policy";

type LaunchRow = { unit_slug: string; started_at: string; metadata: { launch_expires_at?: string } | null };

export async function getViewerSessionStatus(userId: string, targetUnitSlug: string): Promise<ViewerSessionStatus> {
  let sourceUnitSlug: string | undefined;
  try {
    const settings = await getViewerLabSettings();
    if (canRetainViewerSession(settings, targetUnitSlug)) return {
      status: "retained", canProceed: true,
      message: "This learning unit also uses the Viewer. Keep your current streaming window open and continue with the same session."
    };
    const response = await adminRest(`/rest/v1/viewer_lab_sessions?select=unit_slug,started_at,metadata&user_id=eq.${encodeURIComponent(userId)}&course_id=eq.scannex-training-programme&status=eq.launched&order=started_at.desc&limit=1`);
    if (!response.ok) throw new Error("VIEWER_LAUNCH_HISTORY_UNAVAILABLE");
    const [launch] = await response.json() as LaunchRow[];
    if (!launch) return { status: "clear", canProceed: true, message: "You have no Viewer session to end." };
    sourceUnitSlug = launch.unit_slug;
    if (canRetainViewerSession(settings, targetUnitSlug, launch.unit_slug)) return {
      status: "retained", canProceed: true, sourceUnitSlug: launch.unit_slug,
      message: "You can return to the learning unit you are practising with the Viewer."
    };
    const config = getViewerLabConfig();
    if (!config) throw new Error("VIEWER_SESSION_CHECK_NOT_CONFIGURED");
    const launchExpiresAt = launch.metadata?.launch_expires_at ?? new Date(Date.parse(launch.started_at) + config.sessionTtlSeconds * 1000).toISOString();
    if (!Number.isFinite(Date.parse(launchExpiresAt))) throw new Error("VIEWER_LAUNCH_EXPIRY_INVALID");
    return viewerSessionProgressionStatus(await hasRunningViewerSession(config, userId), launchExpiresAt, launch.unit_slug);
  } catch (error) {
    console.error("viewer_session_check_failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return { ...viewerSessionCheckUnavailable, sourceUnitSlug };
  }
}

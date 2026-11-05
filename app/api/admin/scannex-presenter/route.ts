import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getViewerLabConfig } from "@/lib/services/viewer-lab/viewer-lab-config";
import { getViewerLabSettings, getViewerLabCostSummary } from "@/lib/services/viewer-lab/viewer-lab-settings";
import { inspectViewerFleet } from "@/lib/services/viewer-lab/inspect-viewer-fleet";
import { createViewerLabSession } from "@/lib/services/viewer-lab/create-viewer-lab-session";
import { adminRest } from "@/server/supabase/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Open this action from your signed-in APGI page." }, { status: 403 });
  const { session } = await requireAdmin();
  const settings = await getViewerLabSettings();
  const config = getViewerLabConfig();
  if (!settings.enabled || !config) return NextResponse.json({ error: "The Viewer is not enabled or configured." }, { status: 503 });
  const summary = await getViewerLabCostSummary(settings);
  const state = await inspectViewerFleet(summary.recommendedCapacity);
  if (!state.capacity?.ready) return NextResponse.json({ error: "Prepare the classroom Viewer capacity and check readiness before opening the presenter connection." }, { status: 503 });
  const audit = await adminRest("/rest/v1/audit_events", { method: "POST", body: JSON.stringify({ actor_user_id: session.user.id, event_type: "scannex_presenter_launch_requested", entity_type: "viewer_lab", metadata: { course_id: "scannex-training-programme", mode: "presenter", learner_records_affected: false } }) });
  if (!audit.ok) return NextResponse.json({ error: "The presenter launch could not be recorded. Please try again." }, { status: 503 });
  try {
    const launch = await createViewerLabSession({ config, learnerId: `presenter:${session.user.id}`, courseSlug: "scannex-training-programme", unitSlug: "lu6" });
    const destination = new URL(launch.streamingUrl);
    if (destination.protocol !== "https:" || !(destination.hostname === `appstream2.${config.region}.aws.amazon.com` || destination.hostname.endsWith(".amazonappstream.com"))) throw new Error("Unexpected Viewer destination");
    return NextResponse.redirect(destination, { status: 303, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    return NextResponse.json({ error: "The presenter connection could not be opened. Check Viewer readiness and try again." }, { status: 503 });
  }
}

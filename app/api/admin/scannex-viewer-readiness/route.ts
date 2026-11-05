import { NextResponse } from "next/server";
import { getCurrentSession, getUserRoles } from "@/server/auth/session";
import { getViewerLabCostSummary, getViewerLabSettings } from "@/lib/services/viewer-lab/viewer-lab-settings";
import { inspectViewerFleet } from "@/lib/services/viewer-lab/inspect-viewer-fleet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await getCurrentSession();
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!session) return NextResponse.json({ error: "Sign in as an administrator." }, { status: 401, headers });
  if (!(await getUserRoles(session.accessToken)).includes("admin")) return NextResponse.json({ error: "Administrator access is required." }, { status: 403, headers });
  const settings = await getViewerLabSettings(), summary = await getViewerLabCostSummary(settings);
  return NextResponse.json({ classroomLearners: settings.classroomLearnerCount ?? null, additionalPlaces: settings.capacityBuffer, ...await inspectViewerFleet(summary.recommendedCapacity), limits: "Prepared capacity is not proof of a ten-user native Viewer/TrainingTool exercise. Confirm licence, image quality, isolation and the classroom network in a group trial." }, { headers });
}

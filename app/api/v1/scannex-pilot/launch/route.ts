import {
  SCANNEX_PILOT_COURSE, SCANNEX_PILOT_UNIT, isHostedPilotDeployment, isScannexHostedPilot,
} from "@/lib/assessments/scannex-hosted-pilot";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getCurrentSession, getUserRoles } from "@/server/auth/session";
import { devPilotStreamingRole, issueDevPilotStream } from "@/server/services/scannex-pilot-stream";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
const fail = (status: number, error: string) => Response.json({ error }, { status, headers });

export async function POST(request: Request) {
  if (!isHostedPilotDeployment(process.env)) return fail(404, "This pilot is not available here.");
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") !== "same-origin")
    return fail(403, "Open the Viewer from the signed-in V1 pilot worksheet.");
  try {
    const session = await getCurrentSession();
    if (!session) return fail(401, "Sign into APGI again, then retry.");
    const permitted = isScannexHostedPilot({
      environment: process.env.VERCEL_ENV, enabled: process.env.SCANNEX_V1_IMAGE78_PILOT,
      operator: process.env.SCANNEX_V1_PILOT_OPERATOR, authenticatedEmail: session.user.email,
      roles: await getUserRoles(session.accessToken), course: SCANNEX_PILOT_COURSE, unit: SCANNEX_PILOT_UNIT,
    });
    const course = getCourseBySlug(SCANNEX_PILOT_COURSE);
    if (!permitted || !course) return fail(403, "This private Viewer is restricted to the pilot account.");
    const access = await getCourseAccess({
      accessToken: session.accessToken, userId: session.user.id, userEmail: session.user.email, courseId: course.id,
    });
    if (!access.canAccess) return fail(403, "Scannex access could not be confirmed for this account.");
    const role = devPilotStreamingRole();
    if (!role) return fail(503, "Automatic launch is not enabled yet. If your private development Viewer is already open, use it below.");
    const streamingUrl = await issueDevPilotStream(role);
    return Response.json({ streamingUrl }, { headers });
  } catch {
    // Do not expose cloud errors, temporary AWS credentials, or the signed URL in logs.
    return fail(503, "The development Viewer could not be opened. Ask APGI to check that the development builder is running, then retry.");
  }
}

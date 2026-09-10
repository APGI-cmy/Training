import { NextRequest, NextResponse } from "next/server";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getCurrentSession, getSupabaseRestUrl } from "@/server/auth/session";
import { recordProgressForSession } from "@/server/progress/record-progress";

type ScormAttemptInput = {
  completion_status?: string | null;
  success_status?: string | null;
  progress_measure?: number | null;
  score_raw?: number | null;
  score_scaled?: number | null;
  score_min?: number | null;
  score_max?: number | null;
  suspend_data?: string | null;
  location?: string | null;
  total_time?: string | null;
  interactions?: Record<string, string> | null;
};

function headers(accessToken: string, prefer?: string) {
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!apiKey) return null;
  return {
    apikey: apiKey,
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

function text(value: unknown, limit: number) {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function allowedStatus(value: unknown, options: string[]) {
  return typeof value === "string" && options.includes(value) ? value : "unknown";
}

function normalizeAttempt(input: ScormAttemptInput) {
  const interactions = Object.fromEntries(
    Object.entries(input.interactions ?? {})
      .filter(([key, value]) => key.startsWith("cmi.interactions.") && typeof value === "string")
      .slice(0, 250)
      .map(([key, value]) => [key.slice(0, 200), value.slice(0, 4000)])
  );

  return {
    completion_status: allowedStatus(input.completion_status, ["completed", "incomplete", "not attempted", "unknown"]),
    success_status: allowedStatus(input.success_status, ["passed", "failed", "unknown"]),
    progress_measure: number(input.progress_measure),
    score_raw: number(input.score_raw),
    score_scaled: number(input.score_scaled),
    score_min: number(input.score_min),
    score_max: number(input.score_max),
    suspend_data: text(input.suspend_data, 65536),
    location: text(input.location, 4000),
    total_time: text(input.total_time, 64),
    interactions
  };
}

async function context(request: NextRequest, courseSlug: string, unitSlug: string) {
  const session = await getCurrentSession();
  const course = getCourseBySlug(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug || candidate.legacySlug === unitSlug);
  if (!session || !course || !unit?.scormPath) return null;

  const access = await getCourseAccess({
    accessToken: session.accessToken,
    userId: session.user.id,
    userEmail: session.user.email,
    courseId: course.id
  });
  if (!access.canAccess) return null;
  return { session, course, unit };
}

export async function GET(request: NextRequest) {
  const courseSlug = request.nextUrl.searchParams.get("courseSlug") ?? "";
  const unitSlug = request.nextUrl.searchParams.get("unitSlug") ?? "";
  const resolved = await context(request, courseSlug, unitSlug);
  if (!resolved) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const url = getSupabaseRestUrl(
    `/rest/v1/scorm_attempts?select=completion_status,success_status,progress_measure,score_raw,score_scaled,score_min,score_max,suspend_data,location,total_time,interactions&user_id=eq.${resolved.session.user.id}&course_id=eq.${resolved.course.id}&unit_id=eq.${resolved.unit.id}&limit=1`
  );
  const requestHeaders = headers(resolved.session.accessToken);
  if (!url || !requestHeaders) return NextResponse.json({ attempt: null });

  const response = await fetch(url, { headers: requestHeaders, cache: "no-store" });
  const rows = response.ok ? await response.json().catch(() => []) : [];
  return NextResponse.json({ attempt: Array.isArray(rows) ? rows[0] ?? null : null });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    courseSlug?: string;
    unitSlug?: string;
    attempt?: ScormAttemptInput;
  } | null;
  const resolved = await context(request, body?.courseSlug ?? "", body?.unitSlug ?? "");
  if (!resolved || !body?.attempt) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const attempt = normalizeAttempt(body.attempt);
  const url = getSupabaseRestUrl("/rest/v1/scorm_attempts?on_conflict=user_id,course_id,unit_id");
  const requestHeaders = headers(resolved.session.accessToken, "resolution=merge-duplicates,return=representation");
  if (!url || !requestHeaders) return NextResponse.json({ error: "SCORM storage is unavailable" }, { status: 503 });

  const now = new Date().toISOString();
  const response = await fetch(url, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      user_id: resolved.session.user.id,
      course_id: resolved.course.id,
      unit_id: resolved.unit.id,
      ...attempt,
      last_launched_at: now,
      updated_at: now,
      completed_at: attempt.completion_status === "completed" ? now : null,
      passed_at: attempt.success_status === "passed" ? now : null
    }),
    cache: "no-store"
  });

  if (!response.ok) return NextResponse.json({ error: "SCORM storage could not be updated" }, { status: 500 });

  if (attempt.completion_status === "completed" && attempt.success_status === "passed") {
    await recordProgressForSession({
      session: resolved.session,
      courseSlug: resolved.course.slug,
      unitSlug: resolved.unit.slug,
      eventType: "unit_completed"
    });
  }

  return NextResponse.json({ ok: true });
}

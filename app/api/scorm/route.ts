import {providerFetch as fetch} from '@/server/security/provider-fetch';
import { NextRequest, NextResponse } from "next/server";
import { getLearningCourse } from "@/server/services/course-editions";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getCurrentSession, getSupabaseRestUrl } from "@/server/auth/session";
import { recordProgressForSession } from "@/server/progress/record-progress";

import {tigerPolicy} from '@/lib/tiger-progression';
import {saveTigerEvidence,tigerUnitAllowed} from '@/server/services/tiger-progression';

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
  const course = await getLearningCourse(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug || candidate.legacySlug === unitSlug);
  if (!session || !course || !unit?.scormPath) return null;

  const access = await getCourseAccess({
    accessToken: session.accessToken,
    userId: session.user.id,
    userEmail: session.user.email,
    courseId: course.id
  });
  if (!access.canAccess || !await tigerUnitAllowed(session,course,unit)) return null;
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
  if(tigerPolicy(resolved.course,resolved.unit)&&!response.ok)return NextResponse.json({error:'Saved SCORM data is temporarily unavailable.'},{status:503});
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

  const policy=tigerPolicy(resolved.course,resolved.unit);
  if(policy&&request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Not allowed'},{status:403});
  const attempt = normalizeAttempt(body.attempt);
  const reportedCompletion=attempt.completion_status;
  let tiger:Awaited<ReturnType<typeof saveTigerEvidence>>|null=null;
  if(policy){
    try{tiger=await saveTigerEvidence(resolved.session,resolved.course,resolved.unit,{});}
    catch{return NextResponse.json({error:'Viewing requirements could not be verified. Keep this page open and retry.'},{status:503});}
    // Keep the actual quiz score, success and responses, but do not award unit completion early.
    if(!tiger.qualified&&attempt.completion_status==='completed')attempt.completion_status='incomplete';
  }
  const url = getSupabaseRestUrl("/rest/v1/scorm_attempts?on_conflict=user_id,course_id,unit_id");
  const requestHeaders = headers(resolved.session.accessToken, "resolution=merge-duplicates,return=representation");
  if (!url || !requestHeaders) return NextResponse.json({ error: "SCORM storage is unavailable" }, { status: 503 });

  let previous:{completed_at?:string|null;passed_at?:string|null}|undefined;
  if(policy){
    const previousResponse=await fetch(getSupabaseRestUrl(`/rest/v1/scorm_attempts?user_id=eq.${resolved.session.user.id}&course_id=eq.${resolved.course.id}&unit_id=eq.${resolved.unit.id}&select=completed_at,passed_at&limit=1`)!,{headers:requestHeaders,cache:'no-store'});
    if(!previousResponse.ok)return NextResponse.json({error:'Saved results could not be verified.'},{status:503});
    previous=(await previousResponse.json())[0];
  }
  const now = new Date().toISOString();
  const savedAttempt={
      user_id: resolved.session.user.id,
      course_id: resolved.course.id,
      unit_id: resolved.unit.id,
      ...attempt,
      last_launched_at: now,
      updated_at: now,
      completed_at: previous?.completed_at ?? (attempt.completion_status === "completed" ? now : null),
      passed_at: previous?.passed_at ?? (attempt.success_status === "passed" ? now : null)
    };
  const persistAttempt=()=>fetch(url,{method:'POST',headers:requestHeaders,body:JSON.stringify(savedAttempt),cache:'no-store'});
  const response = await persistAttempt();

  if (!response.ok) return NextResponse.json({ error: "SCORM storage could not be updated" }, { status: 500 });

  if(policy){
    // Persist the actual answers and score before they can unlock another unit.
    try{tiger=await saveTigerEvidence(resolved.session,resolved.course,resolved.unit,{attempt:{...attempt,completion_status:reportedCompletion}});}
    catch{return NextResponse.json({error:'Your assessment was saved, but completion could not yet be verified. Retry saving.'},{status:503});}
    if(tiger.qualified&&reportedCompletion==='completed'&&attempt.completion_status!=='completed'){
      attempt.completion_status='completed';savedAttempt.completion_status='completed';savedAttempt.completed_at=previous?.completed_at??now;
      if(!(await persistAttempt()).ok)return NextResponse.json({error:'Your assessment was saved. Retry saving to finish recording completion.'},{status:503});
    }
  }

  if (attempt.completion_status === "completed" && attempt.success_status === "passed") {
    await recordProgressForSession({
      session: resolved.session,
      courseSlug: resolved.course.slug,
      unitSlug: resolved.unit.slug,
      eventType: "unit_completed",
      requirePersistence:!!policy
    });
  }

  return NextResponse.json({ ok: true,...(tiger?{tiger}:{}) });
}

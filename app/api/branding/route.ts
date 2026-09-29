import { NextRequest, NextResponse } from "next/server";
import { getCourseBySlug } from "@/lib/courses";
import { getCurrentSession } from "@/server/auth/session";
import { getLearnerOrganisationBranding } from "@/server/services/branding/course-branding";

export async function GET(request: NextRequest) {
  const courseSlug = request.nextUrl.searchParams.get("courseSlug")?.trim();
  if (courseSlug && !getCourseBySlug(courseSlug)) {
    return NextResponse.json({ branding: null }, { headers: { "Cache-Control": "no-store" } });
  }
  const session = await getCurrentSession();
  const branding = session ? await getLearnerOrganisationBranding(session.user.id) : null;
  return NextResponse.json({ branding }, { headers: { "Cache-Control": "no-store" } });
}

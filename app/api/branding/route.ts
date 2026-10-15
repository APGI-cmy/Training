import { NextRequest, NextResponse } from "next/server";
import { getCourseBySlug } from "@/lib/courses";
import { getCurrentSession, getSupabaseRestUrl } from "@/server/auth/session";
import { contextualCompany } from "@/server/services/company-structure";
import { getLearnerOrganisationBranding } from "@/server/services/branding/course-branding";

export async function GET(request: NextRequest) {
  const courseSlug = request.nextUrl.searchParams.get("courseSlug")?.trim();
  if (courseSlug && !getCourseBySlug(courseSlug)) {
    return NextResponse.json(
      { branding: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const session = await getCurrentSession();
  if (request.nextUrl.searchParams.get("workspace") === "admin")
    return NextResponse.json(
      { branding: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  let company = null;
  if (session) {
    try {
      company = await contextualCompany(
        session,
        courseSlug,
        request.nextUrl.searchParams.get("organisationId") ?? undefined,
      );
    } catch {
      return NextResponse.json(
        { branding: null },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  const branding = company
    ? {
        courseId: `organisation:${company.slug}`,
        brandName: company.name,
        logoUrl: company.logo_path
          ? getSupabaseRestUrl(
              `/storage/v1/object/public/alp-branding-assets/${company.logo_path}`,
            )
          : null,
        primaryColor: company.primary_color,
        secondaryColor: company.secondary_color,
        accentColor: company.accent_color,
        paleColor: company.pale_color,
        footerText: "Hosted by APGI",
        isActive: company.is_active,
      }
    : session
      ? await getLearnerOrganisationBranding(session.user.id)
      : null;
  return NextResponse.json(
    { branding },
    { headers: { "Cache-Control": "no-store" } },
  );
}

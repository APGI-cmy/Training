import {visibleBrandFooter,isPartnerBrand} from '@/lib/white-label';
import {tenantBrandForHost} from '@/server/services/tenant-branding';
import {companyWatermarks} from '@/lib/watermarks';
import { NextRequest, NextResponse } from "next/server";
import { getCourseBySlug } from "@/lib/courses";
import { getCurrentSession, getSupabaseRestUrl } from "@/server/auth/session";
import { contextualCompany,companyActor } from "@/server/services/company-structure";
import { getLearnerOrganisationBranding,getPlatformOrganisationBranding } from "@/server/services/branding/course-branding";

export async function GET(request: NextRequest) {
  const courseSlug = request.nextUrl.searchParams.get("courseSlug")?.trim();
  if (courseSlug && !getCourseBySlug(courseSlug)) {
    return NextResponse.json(
      { branding: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const session = await getCurrentSession();
  if (request.nextUrl.searchParams.get("workspace") === "admin") {
    let branding=null;
    try{if(session&&(await companyActor(session)).isAdmin)branding=await getPlatformOrganisationBranding();}catch{/* Keep failed or unauthorised administration branding neutral. */}
    return NextResponse.json(
      { branding },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const hostedBrand=await tenantBrandForHost(request.nextUrl.hostname);
  if(hostedBrand)return NextResponse.json({branding:hostedBrand},{headers:{"Cache-Control":"no-store"}});
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
  const hostBrand=company?null:await tenantBrandForHost(request.nextUrl.hostname);
  const branding = company
    ? {
        courseId: `organisation:${company.slug}`,
        brandName: company.name,
        watermark:companyWatermarks(company.watermarks).platform,
        watermarkUrl:companyWatermarks(company.watermarks).platform.imagePath?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${companyWatermarks(company.watermarks).platform.imagePath}`):null,
        logoUrl: company.logo_path
          ? getSupabaseRestUrl(
              `/storage/v1/object/public/alp-branding-assets/${company.logo_path}`,
            )
          : null,
        primaryColor: company.primary_color,
        secondaryColor: company.secondary_color,
        accentColor: company.accent_color,
        paleColor: company.pale_color,
        hidePlatformBranding:isPartnerBrand(company.name),
        footerText: visibleBrandFooter(company.name,company.footer_text),
        isActive: company.is_active,
      }
    : session
      ? await getLearnerOrganisationBranding(session.user.id)
      : hostBrand;
  return NextResponse.json(
    { branding },
    { headers: { "Cache-Control": "no-store" } },
  );
}

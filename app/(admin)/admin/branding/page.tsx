import Link from "next/link";
import { BrandingForm } from "@/components/admin/BrandingForm";
import { getCourses, getCourseBySlug } from "@/lib/courses";
import { getBrandingPresets, getCourseBrandingForAdmin } from "@/server/services/branding/course-branding";

export default async function BrandingPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const params = await searchParams;
  const selectedCourse = getCourseBySlug(params.course ?? "") ?? getCourses()[0];
  const [branding, presets] = await Promise.all([
    selectedCourse ? getCourseBrandingForAdmin(selectedCourse.slug) : null,
    getBrandingPresets(),
  ]);

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Change branding</h1>
          <p>Prepare client-branded delivery for an individual course. Domains and hosting remain shared until a future tenant-hosting phase.</p>
        </div>
      </header>
      <nav className="branding-course-picker" aria-label="Choose a course to brand">
        {getCourses().map((course) => <Link key={course.id} className={course.slug === selectedCourse?.slug ? "is-selected" : ""} href={`/admin/branding?course=${course.slug}`}>{course.title}</Link>)}
      </nav>
      <BrandingForm branding={branding} presets={presets} />
    </main>
  );
}

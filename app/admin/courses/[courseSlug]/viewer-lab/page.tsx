import Link from "next/link";
import { notFound } from "next/navigation";
import { ScannexViewerLabWorkspace } from "@/components/admin/ScannexViewerLabWorkspace";
import { getCourseBySlug } from "@/lib/courses";
import { defaultCourseCommerceSetting } from "@/lib/commerce";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getViewerLabCostSummary, getViewerLabSettings, SCANNEX_COURSE_ID } from "@/lib/services/viewer-lab/viewer-lab-settings";
import { getCourseCommerceSettings } from "@/server/services/commerce/get-course-commerce";

export const dynamic = "force-dynamic";

export default async function ScannexViewerLabAdminPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  await requireAdmin();
  const { courseSlug } = await params;
  if (courseSlug !== SCANNEX_COURSE_ID) notFound();
  const course = getCourseBySlug(courseSlug);
  if (!course) notFound();

  const settings = await getViewerLabSettings();
  const [summary, commerce] = await Promise.all([
    getViewerLabCostSummary(settings),
    getCourseCommerceSettings([courseSlug])
  ]);
  const pricing = commerce.get(courseSlug) ?? defaultCourseCommerceSetting(courseSlug);

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div><p className="eyebrow">Scannex course administration</p><h1>Viewer capacity and cost control</h1><p>Choose the learning units that need the hosted Viewer, align availability with the course window and monitor the enrolled-learner cost allowance.</p></div>
        <Link className="secondary-button" href={`/admin/courses/${courseSlug}/preview`}>Back to Scannex course</Link>
      </header>
      <ScannexViewerLabWorkspace settings={settings} summary={summary} units={course.units} baseCoursePriceCents={pricing.priceCents} currency={pricing.currency} />
    </main>
  );
}

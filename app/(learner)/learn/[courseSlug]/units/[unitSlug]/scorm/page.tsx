import { notFound } from "next/navigation";
import { ScormPlayer } from "@/components/course/ScormPlayer";
import { getCourseBySlug } from "@/lib/courses";
import { encodeAssetPath } from "@/lib/asset-path";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { requireSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ courseSlug: string; unitSlug: string }> };

export default async function ScormLaunchPage({ params }: PageProps) {
  const session = await requireSession();
  const { courseSlug, unitSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug || candidate.legacySlug === unitSlug);
  if (!course || !unit?.scormPath) notFound();

  const access = await getCourseAccess({
    accessToken: session.accessToken,
    userId: session.user.id,
    userEmail: session.user.email,
    courseId: course.id
  });
  if (!access.canAccess) notFound();

  return (
    <main className="content-band">
      <div className="content-inner">
        <p className="eyebrow">Learning Unit {unit.order}</p>
        <h1>{unit.title}</h1>
        <p>{unit.subtitle}</p>
        <ScormPlayer
          courseSlug={course.slug}
          unitSlug={unit.slug}
          launchSrc={encodeAssetPath(unit.scormPath)}
          title={unit.title}
        />
      </div>
    </main>
  );
}

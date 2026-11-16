import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { requireReview } from "./course-reviews";
import type { CoursePreview } from "@/lib/course-preview";
import { getCurrentSession, getUserRoles } from "@/server/auth/session";
import { getCatalogueReviews } from "./organisations/get-catalogue-reviews";

export async function coursePreviewEntry(courseSlug: string) {
  const session = await getCurrentSession();
  if (!session) return undefined;
  if ((await getUserRoles(session.accessToken)).includes("admin")) return { href: `/admin/courses/${courseSlug}/preview`, label: "Preview as administrator" };
  const review = (await getCatalogueReviews(session, [courseSlug])).get(courseSlug);
  return review ? { href: `/course-reviews/${review.id}/preview`, label: "Preview as reviewer" } : undefined;
}

export async function requireAdminCoursePreview(courseSlug: string) {
  const { session } = await requireAdmin();
  const shell = getCourseShell(courseSlug);
  if (!shell) notFound();
  const base = `/admin/courses/${shell.course.slug}/preview`;
  const preview: CoursePreview = { scope: `admin:${session.user.id}:${shell.course.id}:${process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}`, courseHref: base, unitBaseHref: base, returnHref: "/catalogue", returnLabel: "Back to course catalogue" };
  return { shell, preview };
}

export async function requireReviewCoursePreview(id: string) {
  const review = await requireReview(id);
  const person = review.round.document.participants.find(p => p.email === review.email);
  if (!review.principal && (!person || person.state === "declined")) notFound();
  const shell = getCourseShell(review.round.course_id);
  if (!shell) notFound();
  const base = `/course-reviews/${id}`;
  const preview: CoursePreview = { scope: `review:${review.session.user.id}:${id}:${review.source.fingerprint}`, courseHref: `${base}/preview`, unitBaseHref: `${base}/units`, returnHref: `${base}#review-units`, returnLabel: "Back to review summary", notice: review.fresh ? undefined : "You are previewing the latest deployed course. Saved findings belong to the earlier registered review version. The platform is automatically verifying and registering the live update before findings or approvals can be saved. Check Changes implemented for its status. Existing evidence is retained." };
  return { ...review, person, shell, preview };
}

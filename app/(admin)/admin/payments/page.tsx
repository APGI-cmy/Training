import { CourseCommerceWorkspace } from "@/components/admin/CourseCommerceWorkspace";
import { getCourses } from "@/lib/courses";
import { defaultCourseCommerceSetting } from "@/lib/commerce";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseCommerceSettings, getCoursePaymentRecipients } from "@/server/services/commerce/get-course-commerce";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({ searchParams }: { searchParams?: Promise<{ course?: string }> }) {
  await requireAdmin();
  const courses = getCourses();
  const requestedCourse = (await searchParams)?.course;
  const course = courses.find((candidate) => candidate.slug === requestedCourse) ?? courses[0];
  const settings = await getCourseCommerceSettings(courses.map((candidate) => candidate.slug));
  const recipients = await getCoursePaymentRecipients(course.slug);
  return <CourseCommerceWorkspace courseId={course.slug} settings={settings.get(course.slug) ?? defaultCourseCommerceSetting(course.slug)} recipients={recipients} />;
}

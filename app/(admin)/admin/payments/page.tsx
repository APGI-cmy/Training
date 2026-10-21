import { CourseCommerceWorkspace } from "@/components/admin/CourseCommerceWorkspace";
import { getCourses } from "@/lib/courses";
import { defaultCourseCommerceSetting } from "@/lib/commerce";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseCommerceSettings, getCoursePaymentRecipients } from "@/server/services/commerce/get-course-commerce";
import Link from "next/link";
import {isPlatformPrincipal} from "@/server/services/platform-principals";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({ searchParams }: { searchParams?: Promise<{ course?: string }> }) {
  await requireAdmin();
  const courses = getCourses();
  const requestedCourse = (await searchParams)?.course;
  const course = courses.find((candidate) => candidate.slug === requestedCourse) ?? courses[0];
  const settings = await getCourseCommerceSettings(courses.map((candidate) => candidate.slug));
  const recipients = await getCoursePaymentRecipients(course.slug);
  const principal=await isPlatformPrincipal();
  return <>{principal?<section className="admin-form-card"><h2>Stripe payment portal</h2><p>Connect APGI and partner Stripe accounts, view approved cost sharing and follow sandbox payment status.</p><Link href="/admin/payments/stripe">Open Stripe payment portal</Link><p>The settings below are planning records. Stripe settlement uses the published, signed commercial schedule.</p></section>:null}<CourseCommerceWorkspace courseId={course.slug} settings={settings.get(course.slug) ?? defaultCourseCommerceSetting(course.slug)} recipients={recipients} /></>;
}

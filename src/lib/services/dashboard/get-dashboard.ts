import { getCourses } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getLearnerProgress } from "@/lib/services/progress/get-learner-progress";
import type { AlpSession } from "@/server/auth/session";
import { getCookieCompletedUnitIds } from "@/server/progress/progress-cookie";

export interface DashboardCourseCard {
  id: string;
  slug: string;
  title: string;
  level: string;
  description: string;
  unitCount: number;
  completedUnits: number;
  progressPercent: number;
  href: string;
}

export interface LearnerDashboard {
  learnerName: string;
  courses: DashboardCourseCard[];
  totalCourses: number;
  totalUnits: number;
  totalCompletedUnits: number;
}

export async function getDashboard(session?: AlpSession): Promise<LearnerDashboard> {
  const sourceCourses = getCourses();

  const enrolledCourses = session
    ? (
        await Promise.all(
          sourceCourses.map(async (course) => ({
            course,
            access: await getCourseAccess({
              accessToken: session.accessToken,
              userId: session.user.id,
              userEmail: session.user.email,
              courseId: course.id
            })
          }))
        )
      )
        .filter(({ access }) => access.status === "enrolled")
        .map(({ course }) => course)
    : [];

  const courses = await Promise.all(
    enrolledCourses.map(async (course) => {
      const [databaseProgress, cookieCompletedUnitIds] = await Promise.all([
        getLearnerProgress({
          accessToken: session!.accessToken,
          userId: session!.user.id,
          courseId: course.id
        }),
        getCookieCompletedUnitIds({
          userId: session!.user.id,
          courseId: course.id
        })
      ]);

      const knownUnitIds = new Set(course.units.map((unit) => unit.id));
      const completedUnitIds = new Set<string>();

      databaseProgress.completedUnitIds.forEach((unitId) => {
        if (knownUnitIds.has(unitId)) {
          completedUnitIds.add(unitId);
        }
      });

      cookieCompletedUnitIds.forEach((unitId) => {
        if (knownUnitIds.has(unitId)) {
          completedUnitIds.add(unitId);
        }
      });

      const completedUnits = completedUnitIds.size;
      const unitCount = course.units.length;

      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        level: course.level,
        description: course.description,
        unitCount,
        completedUnits,
        progressPercent: unitCount === 0 ? 0 : Math.round((completedUnits / unitCount) * 100),
        href: `/learn/${course.slug}`
      };
    })
  );

  return {
    learnerName: "APGI learner",
    courses,
    totalCourses: courses.length,
    totalUnits: courses.reduce((sum, course) => sum + course.unitCount, 0),
    totalCompletedUnits: courses.reduce((sum, course) => sum + course.completedUnits, 0)
  };
}

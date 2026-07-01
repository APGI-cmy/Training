import { getCourses } from "@/lib/courses";
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
  const courses: DashboardCourseCard[] = [];

  const progressSnapshots = session
    ? await Promise.all(
        sourceCourses.map(async (course) => {
          const [databaseProgress, cookieCompletedUnitIds] = await Promise.all([
            getLearnerProgress({
              accessToken: session.accessToken,
              userId: session.user.id,
              courseId: course.id
            }),
            getCookieCompletedUnitIds({
              userId: session.user.id,
              courseId: course.id
            })
          ]);

          return {
            databaseProgress,
            cookieCompletedUnitIds
          };
        })
      )
    : [];

  sourceCourses.forEach((course, index) => {
    const progress = session ? progressSnapshots[index] : undefined;
    const completedUnitIds = new Set(progress?.databaseProgress.completedUnitIds ?? []);

    progress?.cookieCompletedUnitIds.forEach((unitId) => completedUnitIds.add(unitId));

    const completedUnits = completedUnitIds.size;
    const unitCount = course.units.length;

    courses.push({
      id: course.id,
      slug: course.slug,
      title: course.title,
      level: course.level,
      description: course.description,
      unitCount,
      completedUnits,
      progressPercent: unitCount === 0 ? 0 : Math.round((completedUnits / unitCount) * 100),
      href: `/learn/${course.slug}`
    });
  });

  return {
    learnerName: "APGI learner",
    courses,
    totalCourses: courses.length,
    totalUnits: courses.reduce((sum, course) => sum + course.unitCount, 0),
    totalCompletedUnits: courses.reduce((sum, course) => sum + course.completedUnits, 0)
  };
}

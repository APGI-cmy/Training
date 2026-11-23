import { getCourses } from "@/lib/courses";
import {getMyLearningCourses} from '@/server/services/course-editions';
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getLearnerProgress } from "@/lib/services/progress/get-learner-progress";
import type { AlpSession } from "@/server/auth/session";
import { getCookieCompletedUnitIds } from "@/server/progress/progress-cookie";
import {isTigerCourse} from '@/lib/tiger-progression';
import {tigerCompletedUnits} from '@/server/services/tiger-progression';
import {loadProgressDisplayEvidence} from '@/server/services/learning-progress-display';
import {overallLearningProgress,unitProgressDisplay} from '@/lib/learning-progress-display';

export interface DashboardCourseCard {
  id: string;
  slug: string;
  title: string;
  level: string;
  description: string;
  unitCount: number;
  completedUnits: number;
  progressPercent: number;
  overallProgressPercent?: number | null;
  href: string;
  classification?: import("@/lib/course-selection").CourseClassification;
}

export interface LearnerDashboard {
  learnerName: string;
  courses: DashboardCourseCard[];
  totalCourses: number;
  totalUnits: number;
  totalCompletedUnits: number;
  overallProgressPercent?: number | null;
}

export async function getDashboard(session?: AlpSession): Promise<LearnerDashboard> {
  const sourceCourses = session ? await getMyLearningCourses(session) : getCourses();

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
        .filter(({ access }) => access.status === "enrolled" || access.status === "expired")
        .map(({ course,access }) => ({...course,expired:access.status==='expired'}))
    : [];

  const displayEvidence = await loadProgressDisplayEvidence(session && enrolledCourses.length ? [session.user.id] : []);
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

      if(isTigerCourse(course)){
        // Dashboard and course shell must use the same persisted prerequisites.
        // A resume cookie or an old SCORM result alone cannot complete Tiger.
        completedUnitIds.clear();
        for(const id of (await tigerCompletedUnits(session!,course))??[])if(knownUnitIds.has(id))completedUnitIds.add(id);
      }
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
        overallProgressPercent: overallLearningProgress(unitProgressDisplay(course, session!.user.id, displayEvidence, completedUnitIds, true)),
        href: `/learn/${course.slug}${course.expired?'/records':''}`
      };
    })
  );

  const totalUnits = courses.reduce((sum,c) => sum+c.unitCount,0);
  const totalCompletedUnits = courses.reduce((sum,c) => sum+c.completedUnits,0);
  const overallProgressPercent = totalUnits && totalCompletedUnits === totalUnits ? 100 :
    courses.some(c => c.overallProgressPercent === null) ? null : totalUnits ?
      Math.min(99.9,Math.round(courses.reduce((sum,c) => sum+(c.overallProgressPercent ?? 0)*c.unitCount,0)/totalUnits*10)/10) : 0;
  return {
    learnerName: "Learner",
    courses,
    totalCourses: courses.length,
    totalUnits,
    totalCompletedUnits,
    overallProgressPercent
  };
}

import { getCourses } from "@/lib/courses";

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

export function getDashboard(): LearnerDashboard {
  const courses = getCourses().map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    level: course.level,
    description: course.description,
    unitCount: course.units.length,
    completedUnits: 0,
    progressPercent: 0,
    href: `/learn/${course.slug}`
  }));

  return {
    learnerName: "APGI learner",
    courses,
    totalCourses: courses.length,
    totalUnits: courses.reduce((sum, course) => sum + course.unitCount, 0),
    totalCompletedUnits: courses.reduce((sum, course) => sum + course.completedUnits, 0)
  };
}

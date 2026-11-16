import type { CourseShellUnit } from "@/lib/services/courses/get-course-shell";

export interface NextLearningAction {
  label: string;
  href: string;
  unitId?: string;
  isComplete: boolean;
}

export function getNextLearningAction(units: CourseShellUnit[]): NextLearningAction | undefined {
  const nextUnit = units.find((unit) => !unit.isCompleted) ?? units[0];

  if (!nextUnit) {
    return undefined;
  }

  const allComplete = units.length > 0 && units.every((unit) => unit.isCompleted);

  return {
    label: allComplete ? "Review course" : nextUnit.isOpened ? "Continue learning" : "Start learning",
    href: nextUnit.href,
    unitId: nextUnit.id,
    isComplete: allComplete
  };
}

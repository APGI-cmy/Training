import Link from "next/link";
import type { CourseShellUnit } from "@/lib/services/courses/get-course-shell";

export function CourseSidebar({
  courseSlug,
  units,
  activeUnitSlug
}: {
  courseSlug: string;
  units: CourseShellUnit[];
  activeUnitSlug?: string;
}) {
  return (
    <aside className="progress-panel" aria-label="Course units">
      <div>
        <p className="eyebrow">Course shell</p>
        <h2>Learning units</h2>
        <p>Move through the seeded VPSHR Level 0 unit structure.</p>
      </div>
      <nav aria-label="Learning unit navigation">
        <ol className="plain-list">
          {units.map((unit) => {
            const isActive = unit.slug === activeUnitSlug || unit.legacySlug === activeUnitSlug;

            return (
              <li key={unit.id}>
                <Link href={`/learn/${courseSlug}/units/${unit.slug}`}>
                  {unit.order === 0 ? "Orientation" : `Unit ${unit.order}`}: {unit.title}
                </Link>
                {isActive ? <span> Current</span> : null}
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}

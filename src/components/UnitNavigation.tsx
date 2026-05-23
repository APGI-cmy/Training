import Link from "next/link";
import type { LearningUnit } from "@/types/course";

interface UnitNavigationProps {
  previous?: LearningUnit;
  next?: LearningUnit;
}

export function UnitNavigation({ previous, next }: UnitNavigationProps) {
  return (
    <nav className="unit-navigation" aria-label="Learning unit navigation">
      <div>
        {previous && (
          <Link className="secondary-button" href={`/courses/vpshr-level-0/${previous.slug}`}>
            Previous: {previous.title}
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link className="primary-button" href={`/courses/vpshr-level-0/${next.slug}`}>
            Next: {next.title}
          </Link>
        )}
      </div>
    </nav>
  );
}

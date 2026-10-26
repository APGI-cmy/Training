"use client";
import Link from "next/link";
import type { LearningUnit } from "@/types/course";

interface UnitNavigationProps {
  unit?: LearningUnit;
  previous?: LearningUnit;
  next?: LearningUnit;
}

export function UnitNavigation({ unit, previous, next }: UnitNavigationProps) {
  function completeLegacyUnit() {
    // This public legacy page has browser-local progress only, never learner grades.
    try { if (unit) window.localStorage.setItem(`apgi-training-progress-${unit.id}`, "complete"); } catch { /* The legacy page remains navigable if browser storage is unavailable. */ }
  }
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
          <Link className="primary-button" href={`/courses/vpshr-level-0/${next.slug}`} onClick={completeLegacyUnit}>
            Next: {next.title}
          </Link>
        )}
        {!next && unit ? <Link className="primary-button" href="/courses/vpshr-level-0" onClick={completeLegacyUnit}>Finish — return to course</Link> : null}
      </div>
    </nav>
  );
}

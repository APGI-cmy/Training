import Link from "next/link";
import type { LearningUnit } from "@/types/course";

export const legacyVpshrGovernedUnitHrefPattern = "/learn/vpshr-level-0/units/";

interface LearningUnitCardProps {
  courseSlug: string;
  unit: LearningUnit;
}

export function LearningUnitCard({ courseSlug, unit }: LearningUnitCardProps) {
  return (
    <article className="unit-card">
      <div className="unit-card-header">
        <span>{unit.order === 0 ? "Intro" : `LU ${unit.order}`}</span>
        <small>{unit.duration}</small>
      </div>
      <h3>{unit.title}</h3>
      <p>{unit.subtitle}</p>
      <Link href={`/learn/${courseSlug}/units/${unit.slug}`}>View governed unit</Link>
    </article>
  );
}

import Link from "next/link";
import type { LearningUnit } from "@/types/course";

interface LearningUnitCardProps {
  unit: LearningUnit;
}

export function LearningUnitCard({ unit }: LearningUnitCardProps) {
  return (
    <article className="unit-card">
      <div className="unit-card-header">
        <span>{unit.order === 0 ? "Intro" : `LU ${unit.order}`}</span>
        <small>{unit.duration}</small>
      </div>
      <h3>{unit.title}</h3>
      <p>{unit.subtitle}</p>
      <Link href={`/learn/vpshr-level-0/units/${unit.slug}`}>Open gated unit</Link>
    </article>
  );
}

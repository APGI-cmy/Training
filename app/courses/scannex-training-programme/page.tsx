import Link from "next/link";
import { encodeAssetPath, getScannexTrainingProgrammeCourse } from "@/lib/courses";

export const metadata = {
  title: "Scannex Training Programme",
  description: "Access Scannex learning interventions and their supporting e-books."
};

const deploymentOrigin = process.env.NEXT_PUBLIC_DEPLOYMENT_ORIGIN?.replace(/\/$/, "");

function toAbsoluteUrl(path: string): string {
  return deploymentOrigin ? `${deploymentOrigin}${path}` : path;
}

export default function ScannexTrainingProgrammePage() {
  const course = getScannexTrainingProgrammeCourse();

  return (
    <main className="url-module-page">
      <section className="url-module-shell">
        <h1>{course.title}</h1>
        <p className="url-module-note">
          Start each published learning intervention here. Its e-book remains available as a supporting reference.
        </p>
        <p className="url-module-note">
          <Link href="/">Back to course list</Link>
        </p>

        <ul className="url-module-list">
          {course.units.map((unit) => {
            const slug = unit.legacySlug ?? unit.slug;
            const unitPath = `/courses/${course.slug}/${slug}`;
            const eBookPath = encodeAssetPath(unit.publishedPath);
            const hasIntervention = Boolean(unit.learningInterventionPath);

            return (
              <li key={unit.id} className="url-module-item">
                <div>
                  <strong>LU {unit.order}: {unit.title}</strong>
                  <small className="url-module-status">
                    {hasIntervention ? "Learning intervention and e-book available" : "E-book available; learning intervention will appear here when published"}
                  </small>
                  {hasIntervention && <code>{toAbsoluteUrl(unitPath)}</code>}
                </div>
                <div className="url-module-actions">
                  <Link className="open-link open-link-primary" href={unitPath}>
                    {hasIntervention ? "Start learning intervention" : "Open e-book"}
                  </Link>
                  {hasIntervention && (
                    <a className="open-link" href={eBookPath}>
                      Open e-book
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

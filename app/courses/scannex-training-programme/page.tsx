import Link from "next/link";
import { getScannexTrainingProgrammeCourse } from "@/lib/courses";

export const metadata = {
  title: "Scannex Training Programme URL Index",
  description: "Stable URL list for Scannex Training Programme Thinkific lessons."
};

const deploymentOrigin = process.env.NEXT_PUBLIC_DEPLOYMENT_ORIGIN?.replace(/\/$/, "");

function toAbsoluteUrl(path: string): string {
  if (!deploymentOrigin) {
    return path;
  }

  return `${deploymentOrigin}${path}`;
}

export default function ScannexTrainingProgrammePage() {
  const course = getScannexTrainingProgrammeCourse();
  const urls = course.units.map((unit) => {
    const slug = unit.legacySlug ?? unit.slug;
    const path = `/courses/${course.slug}/${slug}`;

    return {
      id: unit.id,
      label: `LU ${unit.order}`,
      title: unit.title,
      path,
      absoluteUrl: toAbsoluteUrl(path),
      status: unit.duration === "E-book" ? "E-book package" : "Placeholder package"
    };
  });

  return (
    <main className="url-module-page">
      <section className="url-module-shell">
        <h1>{course.title} URL Module</h1>
        <p className="url-module-note">Use these URLs in Thinkific Multimedia lessons.</p>
        {deploymentOrigin ? (
          <p className="url-module-note">Base URL: {deploymentOrigin}</p>
        ) : (
          <p className="url-module-note">Set NEXT_PUBLIC_DEPLOYMENT_ORIGIN for full copy-ready URLs.</p>
        )}
        <p className="url-module-note">
          <Link href="/">Back to course list</Link>
        </p>

        <ul className="url-module-list">
          {urls.map((unit) => (
            <li key={unit.id} className="url-module-item">
              <div>
                <strong>
                  {unit.label}: {unit.title}
                </strong>
                <code>{unit.absoluteUrl}</code>
                <small>{unit.status}</small>
              </div>
              <Link className="open-link" href={unit.path}>
                Open
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

import Link from "next/link";
import { getVpshrLevel0Course } from "@/lib/courses";

export const metadata = {
  title: "VPSHR Level 0 URL Index",
  description: "Stable URL list for Thinkific multimedia lessons."
};

const deploymentOrigin = process.env.NEXT_PUBLIC_DEPLOYMENT_ORIGIN?.replace(/\/$/, "");

function toAbsoluteUrl(path: string): string {
  if (!deploymentOrigin) {
    return path;
  }

  return `${deploymentOrigin}${path}`;
}

export default function VpshrLevel0Page() {
  const course = getVpshrLevel0Course();
  const urls = course.units.map((unit) => {
    const slug = unit.legacySlug ?? unit.slug;
    const path = `/courses/${course.slug}/${slug}`;

    return {
      id: unit.id,
      label: unit.order === 0 ? "Introduction" : `Unit ${unit.order}`,
      title: unit.title,
      path,
      absoluteUrl: toAbsoluteUrl(path)
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

        <ul className="url-module-list">
          {urls.map((unit) => (
            <li key={unit.id} className="url-module-item">
              <div>
                <strong>
                  {unit.label}: {unit.title}
                </strong>
                <code>{unit.absoluteUrl}</code>
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

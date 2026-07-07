import Link from "next/link";
import { getCourses } from "@/lib/courses";

export const metadata = {
  title: "APGI Training URL Modules",
  description: "Course list for APGI training URL modules."
};

const deploymentOrigin = process.env.NEXT_PUBLIC_DEPLOYMENT_ORIGIN?.replace(/\/$/, "");

function toAbsoluteUrl(path: string): string {
  if (!deploymentOrigin) {
    return path;
  }

  return `${deploymentOrigin}${path}`;
}

export default function HomePage() {
  const courses = getCourses();

  return (
    <main className="url-module-page">
      <section className="url-module-shell">
        <h1>APGI Training URL Modules</h1>
        <p className="url-module-note">Select a course to open its Thinkific URL list.</p>
        {deploymentOrigin ? <p className="url-module-note">Base URL: {deploymentOrigin}</p> : null}

        <ul className="url-module-list">
          {courses.map((course) => {
            const path = `/courses/${course.slug}`;

            return (
              <li key={course.id} className="url-module-item">
                <div>
                  <strong>{course.title}</strong>
                  <code>{toAbsoluteUrl(path)}</code>
                </div>
                <Link className="open-link" href={path}>
                  Open
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

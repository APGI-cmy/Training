import Link from "next/link";
import { getCourses } from "@/lib/courses";

export default function AdminCoursesPage() {
  const courses = getCourses();

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Administration</p>
        <h1>Course preview</h1>
        <p>Preview course structure without creating learner enrolments or progress records.</p>
      </header>

      <section className="course-grid" aria-label="Administrator course previews">
        {courses.map((course) => (
          <article className="course-card" key={course.id}>
            <p className="eyebrow">{course.level}</p>
            <h2>{course.title}</h2>
            <p>{course.description}</p>
            <Link className="button-link" href={`/admin/courses/${course.slug}/preview`}>
              Preview course
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

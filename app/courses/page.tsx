import Link from "next/link";
import { getCourses } from "@/lib/courses";

export const metadata = {
  title: "Courses"
};

export default function CoursesPage() {
  const courses = getCourses();

  return (
    <main>
      <section className="page-masthead">
        <div className="content-inner">
          <p className="eyebrow">Course catalogue</p>
          <h1>APGI learning pathways</h1>
          <p>Structured, responsive training pages for published course content.</p>
        </div>
      </section>
      <section className="content-band">
        <div className="content-inner card-grid">
          {courses.map((course) => (
            <article className="course-card" key={course.id}>
              <span>{course.level}</span>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <Link className="primary-button" href={`/courses/${course.slug}`}>
                Open course
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

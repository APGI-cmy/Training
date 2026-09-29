import Link from "next/link";
import { getCourses } from "@/lib/courses";
import { CourseCardCover } from "@/components/course/CourseCardCover";

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
            <article className="course-card course-card--visual" key={course.id}>
              <CourseCardCover courseSlug={course.slug} />
              <div className="course-card-body">
                <span>{course.level}</span>
                <h2>{course.title}</h2>
                <p>{course.description}</p>
                <Link className="primary-button" href={`/courses/${course.slug}`}>
                  Explore course
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

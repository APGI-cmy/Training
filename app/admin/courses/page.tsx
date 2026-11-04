import {CourseImageEditor} from '@/components/course/CourseImageEditor';
import {getSavedCourseCardImages} from '@/server/services/course-card-images';
import { requireAdmin } from "@/lib/auth/require-admin";

import Link from "next/link";

import { getCourses } from "@/lib/courses";

import { CourseCardCover } from "@/components/course/CourseCardCover";

import styles from "./courses.module.css";

import { isPlatformPrincipal } from "@/server/services/platform-principals";



export default async function AdminCoursesPage() {

  await requireAdmin();

  const principal = await isPlatformPrincipal();

  const courses = getCourses();
 const cardImages=await getSavedCourseCardImages();



  return (

    <main className={`page-shell ${styles.page}`}>

      <header className={`page-header ${styles.header}`}>

        <p className="eyebrow">Administration</p>

        <h1>Course preview</h1>

        <p>Preview course structure without creating learner enrolments or progress records.</p>

      </header>



      <section className={`course-grid ${styles.grid}`} aria-label="Administrator course previews">

        {courses.map((course) => (

          <article className={`course-card course-card--visual ${styles.card}`} key={course.id}>

            <CourseCardCover courseSlug={course.slug} cover={cardImages[course.slug]} />

            <div className="course-card-body">
 {principal?<CourseImageEditor course={course.slug} title={course.title} current={cardImages[course.slug]?.selection}/>:null}

              <p className="eyebrow">{course.level}</p>

              <h2>{course.title}</h2>

              <p>{course.description}</p>

              <Link className="button-link" href={`/admin/courses/${course.slug}/preview`}>

                Preview course

              </Link>

              {principal ? <Link className="button-link" href={`/course-reviews/new?course=${course.slug}`}>Start publication workflow</Link> : null}

            </div>

          </article>

        ))}

      </section>

    </main>

  );

}

import {getTenantCourses} from '@/server/services/tenant-courses';
import {CourseImageEditor} from '@/components/course/CourseImageEditor';
import {getSavedCourseCardImages} from '@/server/services/course-card-images';
import { requireAdmin } from "@/lib/auth/require-admin";

import Link from "next/link";

import { getCourses } from "@/lib/courses";

import { CourseCardCover } from "@/components/course/CourseCardCover";

import styles from "./courses.module.css";

import { isPlatformPrincipal } from "@/server/services/platform-principals";
import {getPublishedCourseIds} from '@/server/services/course-publication-status';
import {getCatalogueReviews} from '@/server/services/organisations/get-catalogue-reviews';
import {CoursePublicationBadge} from '@/components/course/CoursePublicationBadge';



export default async function AdminCoursesPage() {

  const {session}=await requireAdmin();

  const principal = await isPlatformPrincipal(session);

  const courses = await getTenantCourses();
 const cardImages=await getSavedCourseCardImages();
 const [published,reviews]=await Promise.all([getPublishedCourseIds(courses.map(c=>c.id)),getCatalogueReviews(session,courses.map(c=>c.id))]);



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
              <CoursePublicationBadge published={reviews.get(course.id)?.status==='published'||published?.has(course.id)||(published===null?null:false)} underReview={reviews.get(course.id)?.status==='open'}/>

              <p className="eyebrow">{course.level}</p>

              <h2>{course.title}</h2>

              <p>{course.description}</p>

              <Link className="button-link" href={`/admin/courses/${course.slug}/preview`}>

                Preview course

              </Link>

              {principal ? <Link className="button-link" href={reviews.has(course.id)?`/course-reviews/${reviews.get(course.id)!.id}`:`/course-reviews/new?course=${course.slug}`}>{reviews.get(course.id)?.status==='published'?'View publication record':reviews.has(course.id)?'Open publication workflow':'Start publication workflow'}</Link> : null}
              {principal ? <Link className="button-link" href={`/admin/courses/${course.slug}/editions`}>Editions, access expiry and e-book offers</Link> : null}

            </div>

          </article>

        ))}

      </section>

    </main>

  );

}

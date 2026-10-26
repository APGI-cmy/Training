import Link from "next/link";
import type { Course } from "@/types/course";
import type { CatalogueReview } from "@/server/services/organisations/get-catalogue-reviews";
import { CourseCardCover } from "./CourseCardCover";
import styles from "./compact-course-catalogue.module.css";

const stages:Record<string,string>={content_review:"Content review",commercial_draft:"Commercial preparation",apgi_approval:"Commercial sign-off",partner_offer:"Company acceptance",negotiation:"Commercial discussion",unresolved:"Commercial discussion outstanding",ready_to_publish:"Final publication checks"};

export function CatalogueReviewCard({course,review}:{course:Course;review:CatalogueReview}) {
  return <article className={`course-card course-card--visual ${styles.card}`}>
    <CourseCardCover courseSlug={course.slug}/>
    <div className="course-card-body">
      <p className="eyebrow">{course.level}</p><h2>{course.title}</h2><p>{course.description}</p>
      <div className="course-card-status"><p><strong>{review.company}</strong></p><p><strong>Status: Under review</strong><br/>{stages[review.stage]??"Publication workflow"}</p><p>Not yet open for learner enrolment.</p></div>
      <Link className="button-link" href={`/course-reviews/${review.id}`}>Open course review</Link>
    </div>
  </article>;
}

import { getCourseCover } from "@/lib/course-covers";

export function CourseCardCover({ courseSlug }: { courseSlug: string }) {
  const cover = getCourseCover(courseSlug);
  if (!cover) return <div className="course-card-cover course-card-cover--fallback" aria-hidden="true" />;
  return <div className="course-card-cover"><img src={cover.src} alt={cover.alt} /></div>;
}

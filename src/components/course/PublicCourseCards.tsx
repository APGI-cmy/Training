import type {PublicCourse} from '@/server/services/public-course-catalogue';
export function PublicCourseCards({courses}:{courses:PublicCourse[]}){
 if(!courses.length)return <p>New learning pathways will appear here when they are published.</p>;
 return <div className="public-course-grid">{courses.map(course=><article className="public-course-card" key={course.slug} data-course-slug={course.slug}>
  <div className="public-course-cover">{course.cover?<img src={course.cover.src} alt={course.cover.alt} loading="lazy"/>:null}</div>
  <div className="public-course-body"><span className="public-course-level">{course.level}</span><h2>{course.title}</h2><p>{course.description}</p><p>{course.duration}</p><a className="public-course-link" href={course.href}>Explore course</a></div>
 </article>)}</div>;
}

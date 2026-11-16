import {notFound} from 'next/navigation';
import {getPublicCatalogue} from '@/server/services/public-course-catalogue';
export const dynamic='force-dynamic';
export default async function PublicCoursePage({params}:{params:Promise<{courseSlug:string}>}){
 const {courseSlug}=await params;const {courses}=await getPublicCatalogue();const course=courses.find(c=>c.slug===courseSlug);if(!course)notFound();
 return <main><section className="page-masthead"><div className="content-inner"><p className="eyebrow">{course.level}</p><h1>{course.title}</h1><p>{course.description}</p></div></section><section className="content-band"><div className="content-inner"><p>{course.duration}</p><p>Sign in to view enrolment options and the courses available to your learning profile.</p><a className="primary-button" href="/alp-sign-in">Sign in to the training portal</a><p><a href="/courses">Back to all courses</a></p></div></section></main>;
}

import {getPublicCatalogue} from '@/server/services/public-course-catalogue';
import {PublicCourseCards} from '@/components/course/PublicCourseCards';
export const metadata={title:'Courses'};
export const dynamic='force-dynamic';
export default async function CoursesPage(){
 const catalogue=await getPublicCatalogue().catch(()=>null);
 return <main><link rel="stylesheet" href="/api/public/catalogue.css"/><section className="page-masthead"><div className="content-inner"><p className="eyebrow">Course catalogue</p><h1>APGI learning pathways</h1><p>Explore published courses and find your next learning journey.</p></div></section><section className="content-band"><div className="content-inner">{catalogue?<PublicCourseCards courses={catalogue.courses}/>:<p role="status">The course catalogue is temporarily unavailable. Please try again shortly.</p>}</div></section></main>;
}

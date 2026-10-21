import type {Course} from "@/types/course";

export function CoursePackageNotice({course}:{course:Course}) {
 if(!course.publicationIssues?.length)return null;
 return <section className="review-box" aria-label="Course package checks">
  <h2>Available for review — package corrections required</h2>
  <p>You can test content, commercial and company-branding review. Learner publication remains blocked until these package checks are cleared.</p>
  <ul>{course.publicationIssues.map(issue=><li key={issue}>{issue}</li>)}</ul>
 </section>;
}

"use client";
import {useState} from 'react';
import {CourseFilters} from '@/components/course/CourseFilters';
import {emptyCourseFilter,matchesCourseFilter,classificationLabel} from '@/lib/course-selection';
import Link from "next/link";
import { OVERALL_PROGRESS_HELP } from "@/lib/learning-progress-display";
import { ProgressIndicator } from "@/components/progress/ProgressIndicator";
import { CourseCardCover } from "@/components/course/CourseCardCover";
import type { LearnerDashboard as LearnerDashboardModel } from "@/lib/services/dashboard/get-dashboard";

export function LearnerDashboard({ dashboard,cardImages={} }: { dashboard: LearnerDashboardModel;cardImages?:Record<string,{src:string;alt:string}> }) {
  const [filter,setFilter]=useState(emptyCourseFilter);
  const listed=dashboard.courses.filter(c=>matchesCourseFilter({...c,...(c.classification??{})},filter));
  return (
    <main>
      <section className="page-masthead">
        <div className="content-inner course-masthead-grid">
          <div>
            <p className="eyebrow">Learner dashboard</p>
            <h1>Your learning dashboard</h1>
            <p>
              Your enrolled courses and saved progress are shown below. Select a course to start or continue learning.
            </p>
          </div>
          <ProgressIndicator
            completedUnits={dashboard.totalCompletedUnits}
            totalUnits={dashboard.totalUnits}
            overallPercent={dashboard.overallProgressPercent}
          />
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your learning</p>
              <h2>Your enrolled courses</h2>
            </div>
          </div>
          <CourseFilters courses={dashboard.courses.map(c=>c.classification??{})} value={filter} onChange={setFilter}/>
          <p>{listed.length} of {dashboard.courses.length} enrolled courses shown. Filters do not change your saved progress.</p>
          <div className="card-grid">
            {dashboard.courses.length === 0 ? <p>You have no enrolled courses yet. If you are expecting a course invitation, contact your training administrator.</p> : null}
            {listed.map((course) => (
              <article className="course-card course-card--visual" key={course.id}>
                <CourseCardCover courseSlug={course.slug} cover={cardImages[course.slug]} />
                <div className="course-card-body">
                  <span>{course.level}</span>
                  {course.classification?<small>{classificationLabel(course.classification)}</small>:null}
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <div className="course-card-progress">
                    <small>{course.completedUnits} of {course.unitCount} units complete</small>
                    <progress value={course.overallProgressPercent === null ? undefined : course.overallProgressPercent ?? course.progressPercent} max={100} aria-label={`${course.title}: overall learning progress`} title={OVERALL_PROGRESS_HELP} />
                    <small title={OVERALL_PROGRESS_HELP}>{course.overallProgressPercent === null ? "Overall progress temporarily unavailable" : `${course.overallProgressPercent ?? course.progressPercent}% overall progress`}</small>
                  </div>
                  <Link className="primary-button" href={course.href}>
                    {course.completedUnits > 0 ? "Continue course" : "Open course"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {dashboard.courses.length>0&&!listed.length?<p>No enrolled courses match these filters. Clear the filters to see all your courses.</p>:null}
        </div>
      </section>
    </main>
  );
}

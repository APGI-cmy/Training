"use client";
import {reviewTaskLabels,type ReviewTask} from "@/lib/review-tasks";
export function ReviewerTasks({tasks,onChange,name="review_tasks",disabled=false}:{tasks:ReviewTask[];onChange:(tasks:ReviewTask[])=>void;name?:string;disabled?:boolean}){
 return <fieldset className="review-task-selection"><legend>Review assignments</legend><input type="hidden" name={name} value={JSON.stringify(tasks)}/>{(Object.keys(reviewTaskLabels) as ReviewTask[]).map(task=><label key={task}><input type="checkbox" checked={tasks.includes(task)} disabled={disabled} onChange={e=>onChange(e.target.checked?[...tasks,task]:tasks.filter(t=>t!==task))}/>{reviewTaskLabels[task]}</label>)}<small>Choose one or more. Assignments do not grant administrator rights or replace the required commercial signatures.</small></fieldset>;
}

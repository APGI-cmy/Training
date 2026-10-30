import type {ReactNode} from "react";
import type {WorkflowStep} from "@/lib/publication-guide";
import "./workflow-guide.css";
import {WorkflowAnchorNavigator} from "./WorkflowAnchorNavigator";
import {approvalWorkflowSummary} from '@/lib/approval-workflow';
function ProgressStep({step}:{step:WorkflowStep}){
 const approval=step.id==='commercials'||step.id==='branding',summary=approval?approvalWorkflowSummary(step):null;
 const content=<><span aria-hidden="true" className="workflow-status-icon">{step.done?"✓":"×"}</span><span>{step.number&&step.number.includes(".")?`${step.number}. `:""}{step.label}<small>{step.done?"Complete":"Not complete"}{step.current?" · Current step":""}</small></span></>;
 return <li className="workflow-step" data-complete={step.done} aria-current={step.current?"step":undefined}>{step.href?<a className="workflow-step-link" href={step.href}>{content}{summary?<small className="workflow-approval-summary">{summary.complete}/{summary.total} approval tasks complete · Open workflow</small>:null}</a>:<div className="workflow-step-link">{content}</div>}{approval?null:step.children?.length?<details open={step.current}><summary>Show or hide tasks for step {step.number}</summary>{step.note?<p>{step.note}</p>:null}<ol>{step.children.map(child=><ProgressStep key={child.id} step={child}/>)}</ol></details>:step.note?<p>{step.note}</p>:null}</li>;
}
export function WorkflowGuide({steps}:{steps:WorkflowStep[]}){
 return <aside className="workflow-guide" aria-label="Course publication progress"><details open><summary>Course workflow</summary><p>Green ✓ complete · Red × not complete. Open commercial or branding workflows for their approval tasks; expand other steps for details.</p><ol>{steps.map(step=><ProgressStep key={step.id} step={step}/>)}</ol></details></aside>;
}
export function WorkflowFrame({steps,children}:{steps:WorkflowStep[];children:ReactNode}){return <div className="workflow-layout"><WorkflowAnchorNavigator/><WorkflowGuide steps={steps}/><div className="workflow-content">{children}</div></div>;}

import type {ReactNode} from "react";
import type {WorkflowStep} from "@/lib/publication-guide";
import "./workflow-guide.css";
function ProgressStep({step}:{step:WorkflowStep}){
 const content=<><span aria-hidden="true" className="workflow-status-icon">{step.done?"✓":"×"}</span><span>{step.label}<small>{step.done?"Complete":"Not complete"}{step.current?" · Current step":""}</small></span></>;
 return <li className="workflow-step" data-complete={step.done} aria-current={step.current?"step":undefined}>{step.children?.length?<details open={step.current}><summary>{content}</summary>{step.href?<a className="workflow-open-step" href={step.href}>Open this step</a>:null}{step.note?<p>{step.note}</p>:null}<ol>{step.children.map(child=><ProgressStep key={child.id} step={child}/>)}</ol></details>:<>{step.href?<a className="workflow-step-link" href={step.href}>{content}</a>:<div className="workflow-step-link">{content}</div>}{step.note?<p>{step.note}</p>:null}</>}</li>;
}
export function WorkflowGuide({steps}:{steps:WorkflowStep[]}){
 return <aside className="workflow-guide" aria-label="Course publication progress"><details open><summary>Course workflow</summary><p>Green ✓ complete · Red × not complete. Expand a step to see its tasks.</p><ol>{steps.map(step=><ProgressStep key={step.id} step={step}/>)}</ol></details></aside>;
}
export function WorkflowFrame({steps,children}:{steps:WorkflowStep[];children:ReactNode}){return <div className="workflow-layout"><WorkflowGuide steps={steps}/><div className="workflow-content">{children}</div></div>;}

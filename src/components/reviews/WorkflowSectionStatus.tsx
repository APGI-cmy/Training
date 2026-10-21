import type {WorkflowStep} from "@/lib/publication-guide";
export function WorkflowSectionStatus({step}:{step?:WorkflowStep}){
 if(!step)return null;
 return <span className="workflow-section-status" data-complete={step.done} aria-label={`Step ${step.number}: ${step.label.replace(/^\d+\.\s*/,"")} — ${step.done?"Complete":"Not complete"}`}><span aria-hidden="true">{step.done?"✓":"×"}</span><span>Step {step.number}<strong>{step.done?"Complete":"Not complete"}</strong></span></span>;
}
export function WorkflowSectionNote({step}:{step?:WorkflowStep}){return step?.note?<p className="workflow-section-note">{step.note}</p>:null;}
export function WorkflowSectionHeading({title,step}:{title:string;step?:WorkflowStep}){return <><div className="workflow-section-heading"><h2>{title}</h2><WorkflowSectionStatus step={step}/></div><WorkflowSectionNote step={step}/></>;}

import type {WorkflowStep} from './publication-guide';

export function approvalWorkflowSummary(step:WorkflowStep){
 const tasks=step.children??[],complete=tasks.filter(task=>task.done).length;
 return {complete,total:tasks.length,pending:tasks.filter(task=>!task.done),
  text:tasks.length?`${complete}/${tasks.length} approval tasks complete. ${step.done?'This stage is complete.':'Open the workflow to see the outstanding decisions.'}`:step.note??(step.done?'No additional approval is required.':'Open the workflow to continue.')};
}

// Existing notification links remain valid, including links into earlier decisions.
export function approvalWorkflowOwnsAnchor(kind:'commercials'|'branding',anchor:string){
 return kind==='commercials'?(anchor.startsWith('commercial-')||anchor==='assigned-commercial-review'):
  anchor==='branding-review'||anchor==='branding-owner-signoff'||anchor==='branding-preview'||anchor.startsWith('branding-reviewer-');
}

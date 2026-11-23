export type LearningSaveIssue='session_required'|'learner_changed'|'save_failed';
export class LearningSaveError extends Error {
  constructor(readonly code:LearningSaveIssue){super(code);}
}
// Failed writes are never reported as saved, or silently retried as another account.
export async function learningResponse(response:Response){
  if(response.ok)return response;
  const body=await response.json().catch(()=>({}));
  throw new LearningSaveError(body.code==='learner_changed'?'learner_changed':body.code==='session_required'||response.status===401?'session_required':'save_failed');
}

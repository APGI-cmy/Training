import {NextResponse} from 'next/server';
import {getCurrentSession} from './session';

class LearningSessionError extends Error {
  constructor(readonly code:'session_required'|'learner_changed'){super(code);}
}
export async function requireLearningSession(expectedLearnerId?:unknown){
  const session=await getCurrentSession();
  if(!session)throw new LearningSessionError('session_required');
  if(expectedLearnerId!==undefined&&expectedLearnerId!==session.user.id)throw new LearningSessionError('learner_changed');
  return session;
}
export function learningSessionResponse(error:unknown){
  if(!(error instanceof LearningSessionError))return null;
  return NextResponse.json({code:error.code,error:error.code==='session_required'
    ?'Sign in again in a separate tab, then retry saving here.'
    :'This page belongs to a different learner. Sign in with the original learner before retrying.'},
    {status:error.code==='session_required'?401:409,headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}});
}

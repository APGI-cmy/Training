/** Navigation evidence only. None of these records award a grade or qualification. */
export type SequenceState={begun:boolean;through:number;summary:boolean};
export type SequenceRecord=SequenceState&{document:string;profile:string;steps:number};
export const emptySequence=():SequenceState=>({begun:false,through:-1,summary:false});
export function sequenceStepAllowed(state:SequenceState,index:number,count:number,completed=false){
 return index>=0&&index<count&&(completed||state.begun&&index<=state.through+1);
}
export function sequenceSummaryAllowed(state:SequenceState,count:number,completed=false){return completed||state.begun&&state.through===count-1;}
export function sequenceRecordValid(value:unknown):value is SequenceRecord {
 if(!value||typeof value!=='object')return false;
 const v=value as SequenceRecord;
 return typeof v.document==='string'&&v.document.length<=1000&&v.document.startsWith('/courses/')&&!/[?#\\\u0000-\u001f]/.test(v.document)&&
  typeof v.profile==='string'&&/^[a-z0-9-]{1,60}$/.test(v.profile)&&Number.isInteger(v.steps)&&v.steps>=1&&v.steps<=120&&
  typeof v.begun==='boolean'&&Number.isInteger(v.through)&&v.through>=-1&&v.through<v.steps&&typeof v.summary==='boolean'&&
  (v.begun||v.through===-1&&!v.summary)&&(!v.summary||v.through===v.steps-1);
}
export const sequenceKey=(r:Pick<SequenceRecord,'document'|'profile'|'steps'>)=>`${r.document}|${r.profile}|${r.steps}`;

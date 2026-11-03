export type ReviewEmailSection={heading:string;body:string;items?:string[]};
// Read the saved message, not today's live round: formatting must not change
// what a queued notification, commercial decision or frozen invitation said.
export function reviewEmailSections(body:string,title:string,kind?:string):ReviewEmailSection[]{
 let main=body.replace(/\r\n?/g,'\n');const extra:ReviewEmailSection[]=[];
 const progress=/\n\n([^\n]+)\nCutoff: ([^\n]+)\n([\s\S]*?)\nReports submitted: (\d+)\nOpen blocking findings: (\d+)(?=\n|$)/.exec(main);
 if(progress&&progress[1]===title){
  main=main.replace(progress[0],'');
  extra.push({heading:'Review progress at the time of this message',body:'',items:[`Review cutoff: ${progress[2]}`,`Reports submitted: ${progress[4]}`,`Open blocking findings: ${progress[5]}`]});
  extra.push({heading:'Review team',body:'',items:progress[3].split('\n').filter(Boolean)});
 }
 const label=kind==='progress_digest'?'Daily review summary':kind?.includes('commercial')?'Commercial review update':kind?.includes('branding')?'Branding review update':kind==='reminder'?'Action required':kind==='invitation'?'Review instructions':'Review update';
 const decision=/^(\S+@\S+) recorded ([^\n]+?) for (commercials|branding) revision ([^:\n]+): ([\s\S]*)$/.exec(main);
 if(decision){
  const marker='This task decision does not replace',at=decision[5].lastIndexOf(marker);
  const comment=(at>=0?decision[5].slice(0,at):decision[5]).trim();
  return [{heading:label,body:'',items:[`Recorded by: ${decision[1]}`,`Decision: ${decision[2]}`,`Revision: ${decision[4]}`]},
   {heading:'Reviewer comments',body:comment},...(at>=0?[{heading:'Approval scope',body:decision[5].slice(at)}]:[]),...extra];
 }
 return [{heading:label,body:main.trim()},...extra];
}

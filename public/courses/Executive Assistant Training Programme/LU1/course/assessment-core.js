(function(scope){'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 function initial(data){return {schema:1,contentHash:data.contentHash,position:1,visited:[],acknowledged:[],firstBrief:false,prepared:false,remViews:{},remDone:[],quiz:{attempt:0,phase:'not-started',current:0,counts:{},answers:{},locked:{},correct:{},history:[],failedTargets:[],order:{}}};}
 function validate(s,data){
  if(!s||s.schema!==1||s.contentHash!==data.contentHash)throw Error('Saved state belongs to another course revision. No attempt state was restored.');
  const ints=a=>Array.isArray(a)&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=18)&&new Set(a).size===a.length;
  if(!ints(s.visited)||!ints(s.acknowledged)||!Number.isInteger(s.position)||s.position<1||s.position>18||typeof s.firstBrief!=='boolean'||typeof s.prepared!=='boolean'||!s.remViews||!Array.isArray(s.remDone))throw Error('Saved progress is malformed.');
  const q=s.quiz;if(!q||!Number.isInteger(q.attempt)||q.attempt<0||q.attempt>2||!['not-started','active','passed','failed'].includes(q.phase)||!Number.isInteger(q.current)||q.current<0||q.current>=data.quiz.length||!Array.isArray(q.history)||q.history.length>2||!Array.isArray(q.failedTargets))throw Error('Saved quiz state is invalid.');
  for(const item of data.quiz){const n=q.counts[item.id]||0;if(!Number.isInteger(n)||n<0||n>3)throw Error('Saved question attempts are invalid.');if(q.locked[item.id]&&n===0)throw Error('Invalid locked question.');if(q.correct[item.id]&&!q.locked[item.id])throw Error('Invalid question result.');}
  return clone(s);
 }
 function seed(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
 function order(s,q){if(!s.quiz.order[q.id]){const a=q.options.map(o=>o[0]);let n=seed(q.id+':'+s.quiz.attempt);for(let i=a.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[a[i],a[j]]=[a[j],a[i]];}s.quiz.order[q.id]=a;}return s.quiz.order[q.id];}
 function start(s,data){
  const q=s.quiz;if(q.phase==='passed')throw Error('A passed quiz cannot be retried in this test.');if(q.phase==='active')return;
  if(q.attempt>=2)throw Error('Both quiz attempts have been used. Seek support and authorised reassessment.');
  if(q.attempt===1&&!q.failedTargets.every(n=>s.remDone.includes(n)))throw Error('Complete the relevant teaching review and remediation practice before retrying.');
  s.quiz={...q,attempt:q.attempt+1,phase:'active',current:0,counts:{},answers:{},locked:{},correct:{},order:{},score:null};
  data.quiz.forEach(item=>order(s,item));
 }
 function completeResponse(q,a){
  const ids=q.options.map(o=>o[0]);if(q.type==='matching')return a&&typeof a==='object'&&!Array.isArray(a)&&ids.every(id=>q.targets.some(t=>t[0]===a[id]))&&Object.keys(a).length===ids.length;
  if(!Array.isArray(a)||new Set(a).size!==a.length||!a.every(id=>ids.includes(id)))return false;
  return q.type==='single'?a.length===1:q.type==='ordering'?a.length===ids.length:a.length>0;
 }
 function isCorrect(q,a){if(!completeResponse(q,a))return false;if(q.type==='matching')return Object.keys(q.key).every(k=>a[k]===q.key[k]);if(q.type==='ordering')return q.key.every((id,i)=>a[i]===id);return a.length===q.key.length&&q.key.every(id=>a.includes(id));}
 function submit(s,data,id,answer){
  if(s.quiz.phase!=='active')throw Error('No active quiz attempt.');const q=data.quiz.find(q=>q.id===id);if(!q||data.quiz[s.quiz.current].id!==id)throw Error('This is not the active question.');
  if(s.quiz.locked[id]||(s.quiz.counts[id]||0)>=3)throw Error('This question is already closed.');if(!completeResponse(q,answer))throw Error('Complete the response before submitting. Empty or incomplete answers do not use an attempt.');
  const count=(s.quiz.counts[id]||0)+1,correct=isCorrect(q,answer);s.quiz.counts[id]=count;s.quiz.answers[id]=clone(answer);s.quiz.correct[id]=correct;s.quiz.locked[id]=correct||count===3;return {correct,count,locked:s.quiz.locked[id]};
 }
 function next(s,data){const q=data.quiz[s.quiz.current];if(!s.quiz.locked[q.id])throw Error('Finish this question before continuing.');if(s.quiz.current<data.quiz.length-1){s.quiz.current++;return;}finish(s,data);}
 function finish(s,data){if(s.quiz.phase!=='active'||!data.quiz.every(q=>s.quiz.locked[q.id]))throw Error('All questions must be closed before the result.');const score=data.quiz.filter(q=>s.quiz.correct[q.id]).length*10;s.quiz.score=score;s.quiz.phase=score>=80?'passed':'failed';s.quiz.failedTargets=[...new Set(data.quiz.filter(q=>!s.quiz.correct[q.id]).map(q=>q.target))];s.quiz.history.push({attempt:s.quiz.attempt,score,phase:s.quiz.phase,failedTargets:[...s.quiz.failedTargets]});s.remViews={};s.remDone=[];return score;}
 function view(s,n,id){if(s.quiz.phase==='failed'&&s.quiz.attempt<2&&s.quiz.failedTargets.includes(n)){s.remViews[n]||=[];if(!s.remViews[n].includes(id))s.remViews[n].push(id);}}
 function remediation(s,data,n,response,acknowledge=false){
  if(s.quiz.phase!=='failed'||s.quiz.attempt>=2||!s.quiz.failedTargets.includes(n))throw Error('This topic is not a pending retry review.');
  const a=data.activities.find(a=>a.number===n),c=a.config?.content;
  const panelModels=['tabs','accordion','sequence','comparison','steps','timeline','process','cyclic-process','media-catalog','faq','glossary','labeled-graphic','hotspot','guided-image','circle-diagram','pyramid'];
  const required=panelModels.includes(a.model)?c.items.map(x=>x.id):a.model==='branching'?['route-ended']:['practice-reviewed'];
  if(!required.every(id=>(s.remViews[n]||[]).includes(id)))throw Error('Explore all required teaching panels or finish a branch route before recording the remediation practice.');
  if(!acknowledge&&String(response||'').trim().split(/\s+/).length<8)throw Error('Write a useful new response of at least eight words, or use the accessible reflect-and-acknowledge route.');
  if(!s.remDone.includes(n))s.remDone.push(n);return true;
 }
 function keysVisible(s){return s.quiz.phase==='passed'||(s.quiz.phase==='failed'&&s.quiz.attempt>=2);}
 scope.LU1Assessment={initial,validate,start,submit,next,finish,order,isCorrect,completeResponse,view,remediation,keysVisible,clone};
 if(typeof module!=='undefined')module.exports=scope.LU1Assessment;
})(typeof window==='undefined'?globalThis:window);

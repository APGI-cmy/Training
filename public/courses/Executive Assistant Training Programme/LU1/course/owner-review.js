/* Owner's completed-course review, 28 October. Local review remains separate
   from learner attempts, assessor decisions and publication. */
(function(w){'use strict';
const data=w.LU1_DATA,resources=w.LU1_OWNER_REVIEW_DATA,$=id=>document.getElementById(id);
const E=(tag,text,parent,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent?.append(n);return n;},B=(text,fn,parent,cls)=>{const b=E('button',text,parent,cls);b.type='button';b.onclick=fn;return b;};
let api,currentActivity=1,bookWindow;
function go(activity,anchor){api.navigate(activity);const scenes=w.LU1Scenes.getScenes(),i=scenes.findIndex(n=>n.id===anchor||n.querySelector('#'+anchor));if(i>=0)w.LU1Scenes.show(i,false);}
function reference(options={}){
 const activity=options.activity||w.LU1_CURRENT_SCENE?.activity||currentActivity,anchor=options.anchor||w.LU1_CURRENT_SCENE?.anchor||'';
 if(options.page)return{page:options.page,heading:options.heading||'Related workbook guidance'};
 if(options.tool)return resources.reading.tools[options.tool];
 if(activity===15&&!api?.getState().firstBrief&&!(w.LU1_REVIEW_MODE&&api?.get('review-preview-later-case')))return{page:35,heading:'Starting-brief practice guidance'};
 return resources.reading.scenes.find(x=>x.activity===activity&&x.anchor===anchor)||resources.reading.activities.find(x=>x.activity===activity)||{page:4,heading:'A note to the reader'};
}
function openReading(options={}){
 api?.stop();const ref=reference(options),url=new URL('ebook.html',location.href);
 url.searchParams.set('page',String(ref.page));url.searchParams.set('returnActivity',String(w.LU1_CURRENT_SCENE?.activity||currentActivity));url.searchParams.set('returnScene',w.LU1_CURRENT_SCENE?.anchor||'');if(w.LU1_REVIEW_MODE)url.searchParams.set('review','1');
 bookWindow=w.open(url.href,'lu1-reference-book','popup=yes,width=1200,height=900,resizable=yes,scrollbars=yes');
 if(bookWindow){bookWindow.focus?.();return;}
 let fallback=$('reading-window-status');if(!fallback){fallback=E('p',undefined,$('lesson'),'reading-window-status');fallback.id='reading-window-status';fallback.setAttribute('role','status');}
 fallback.replaceChildren();E('span','The book window did not open. ',fallback);const link=E('a','Open the reference book on page '+ref.page,fallback);link.href=url.href;link.target='lu1-reference-book';
}
function readingControl(){
 let button=$('scene-read-more');if(!button){button=B('Read more ↗',()=>openReading(),document.querySelector('.lesson-meta'),'scene-read-more');button.id='scene-read-more';}
 const ref=reference();button.title='Open '+(ref.heading||'the related workbook section')+' on page '+ref.page+' in a separate reading window. You can move that window to another screen.';button.setAttribute('aria-label',button.title);
 button.hidden=currentActivity===17;
}
const toolLessons={'T1.1':{activity:3,anchor:'ls-worked-brief',purpose:'Your support brief connects a business purpose to the work, owners and readiness evidence needed for a useful decision.'},'T1.2':{activity:11,anchor:'ls-worked-agreement',purpose:'Your working agreement makes duties, limits, information access, communication and accepted cover explicit.'},'T1.3':{activity:10,anchor:'ls-reflection',purpose:'Your priority decision brief explains the competing requests, options and recommendation, and identifies the separate decisions still required.'},'T1.4':{activity:13,anchor:'ls-worked-cover',purpose:'Your handover record identifies the work, period, access, unresolved items and actual acceptance needed for reliable cover.'},'T1.5':{activity:18,anchor:'ls-worked-review',purpose:'Your partnership review records an example, an observed cause of friction, an agreed adjustment and evidence for the next review.'}};
function toolSupport(drawer,tool){
 const lesson=toolLessons[tool.id],guide=E('section',undefined,drawer,'tool-reading-guide');E('h3','Help with this tool',guide);E('p',lesson.purpose,guide);
 B('Read this tool in the reference book',()=>openReading({tool:tool.id}),guide);
 B('Open the guided learning example',()=>{api.set('guided-return',{activity:currentActivity,anchor:w.LU1_CURRENT_SCENE?.anchor||''});go(lesson.activity,lesson.anchor);},guide);
 E('p','The completed fictional example above is a comparison aid. Your draft saves automatically; it is not an assessed submission.',guide);
}
function returnSupport(root){
 root.querySelectorAll('.guided-return').forEach(n=>n.remove());
 const saved=api.get('guided-return');if(!saved||(saved.activity===currentActivity&&saved.anchor===(w.LU1_CURRENT_SCENE?.anchor||'')))return;
 const node=root.querySelector('.learning-scene:not([hidden])')||root.firstElementChild;if(!node)return;
 const bar=E('div',undefined,node,'guided-return');B('Return to your open learning task',()=>{api.set('guided-return',null);go(saved.activity,saved.anchor);},bar);
}
function initialBriefSupport(activity,root){
 if(activity.number===15&&root.querySelector('.lock')){
  const lock=root.querySelector('.lock'),old=lock.querySelector('button');
  if(old){old.textContent='Open my starting decision brief';old.onclick=()=>{api.set('initial-brief-return',{activity:15});go(10,'ls-reflection');w.LU1Revision.openTool('T1.3');};}
  E('p','The starting brief is your own response to the information available at 07:40. Complete the decision-brief fields or use the reflection acknowledgement there, then return here to compare with the later record.',lock);
  B('Read the starting-brief instructions',()=>openReading({page:35}),lock);
  if(w.LU1_REVIEW_MODE){B('Preview the later record for review',()=>{api.set('review-preview-later-case',true);api.render();},lock);$('acknowledge').disabled=false;$('acknowledge').title='Record that you inspected this review scene. This does not create a learner brief or remove the learner gate.';}
 }
 if(activity.number===15&&w.LU1_REVIEW_MODE&&api.get('review-preview-later-case')&&!api.getState().firstBrief){const note=E('p','Reviewer preview: the later record is open for inspection. No initial learner brief or completion result has been created.',root.firstElementChild,'review-preview-note');note.dataset.reviewOnly='true';}
 if(activity.number===10&&api.get('initial-brief-return')){
  const node=root.querySelector('#ls-reflection')?.closest('.learning-scene')||root.querySelector('.apgi')||root.firstElementChild;
  const bar=E('section',undefined,node,'initial-brief-return');E('h3','Your starting brief and the later record stay separate',bar);E('p','You can write in the decision brief beside the lesson or in the reflection box. Your first response records what you knew before the later confirmations.',bar);
  const status=E('p','',bar);status.setAttribute('role','status');B('Return to the later record',()=>{if(!api.getState().firstBrief){status.textContent='Please write your initial reasoning or use the reflection acknowledgement before opening the later record.';return;}api.set('initial-brief-return',null);api.navigate(15);const scenes=w.LU1Scenes.getScenes(),i=scenes.findIndex(n=>n.querySelector('.apgi')||n.matches('.apgi'));if(i>=0)w.LU1Scenes.show(i,false);},bar);
 }
}
const rationale={
 routine:'The request stays within an agreed free period and the supplied delegation. It affects none of the protected commitments, external undertakings, costs or specialist dependencies named in the case.',
 spending:'The order exceeds the fictional USD 2,000 conditional limit. A legitimate need does not supply the missing spending approval. The proper decision-maker must approve the exception; splitting the order cannot create authority.',
 bank:'System access allows Daniel to enter information, but it does not give him authority to approve supplier banking changes. Finance must use the approved independent verification route; Daniel should retain the owner and follow-up point.',
 private:'The request would disclose private diary and family information without permission. Daniel must decline the unauthorised disclosure and use the approved concern or escalation route rather than forwarding the full information.'
};
function classificationFeedback(a,root){
 if(a.number!==7)return;const check=[...root.querySelectorAll('button')].find(b=>b.textContent==='Check groups');if(!check)return;
 const rows=[...root.querySelectorAll('.assignment select')].map(s=>s.closest('label'));if(rows.length!==a.config.content.items.length)return;
 const originalCheck=check.cloneNode(false);originalCheck.onclick=check.onclick;
 function show(row,item,save=false){const select=row.querySelector('select');if(!select?.value)return false;
  let result=row.querySelector('.request-practice-feedback');if(!result)result=E('section',undefined,row,'request-practice-feedback');result.replaceChildren();
  const correct=select.value===item.target,expected=a.config.content.targets.find(t=>t.id===item.target).title;
  E('h3',correct?'Your response matches this request.':'This response needs a different route.',result);E('p','The intended response is '+expected+'. '+rationale[item.id],result);
  E('p','This is explained learning practice. It does not grant workplace authority or an assessment pass.',result,'small');
  if(save){api.set('request-practice-'+item.id,{selection:select.value,checked:true,correct});api.stop();w.LU1Scenes.playClips(['D07-'+item.id,'D07-correctFeedback'],true);}
  return true;
 }
 check.textContent='Check this request';check.onclick=()=>{const row=rows.find(n=>!n.hidden)||rows[0],item=a.config.content.items[rows.indexOf(row)];if(!show(row,item,true)){let msg=row.querySelector('.request-practice-feedback');if(!msg)msg=E('section',undefined,row,'request-practice-feedback');msg.textContent='Choose the response you would use for this request, then check it.';msg.setAttribute('role','alert');return;}
  if(rows.every((row,i)=>api.get('request-practice-'+a.config.content.items[i].id)?.checked))originalCheck.click();
  row.querySelector('.request-practice-feedback').scrollIntoView({block:'nearest'});
 };
 rows.forEach((row,i)=>{const item=a.config.content.items[i],saved=api.get('request-practice-'+item.id);if(saved?.checked&&saved.selection===row.querySelector('select')?.value)show(row,item);row.querySelector('select').addEventListener('change',()=>{row.querySelector('.request-practice-feedback')?.remove();api.set('request-practice-'+item.id,{selection:row.querySelector('select').value,checked:false});});});
}
const repairs={
 all:{title:'A bounded administrative role',example:'Daniel coordinates the administrative work included in the agreed role and within its stated limits. A request outside that scope is referred to the identified decision-maker. Daniel records the required decision and confirmation before making a commitment for someone else.',checks:['The included work is named.','Work outside the scope has an identified decision owner.','The clause does not promise unlimited duties.','A required decision stays unconfirmed until it is actually given.']},
 room:{title:'An accepted service assignment',example:'Any control-room monitoring or cover must be agreed separately with the responsible service owner. The record identifies the assignment, service scope and period, and records the owner’s actual acceptance. An agreement between Lindiwe and Daniel does not itself commit the control room.',checks:['The actual service assignment and period are defined.','The control-room service owner is identified.','Acceptance is obtained from that owner.','Unaccepted coverage remains an open condition rather than a promise.']},
 pay:{title:'Ordering authority is separate from payment authority',example:'In this fictional example, Daniel may order pre-approved meeting consumables up to USD 2,000 per event only within an already approved budget and supplier process. He may not split purchases to avoid the limit or release payment. Payment and supplier banking changes follow the approved finance decision and verification route.',checks:['The permitted task is ordering pre-approved consumables.','The fictional amount, per-event limit and conditions remain explicit.','Payment release is not added to Daniel’s authority.','The finance decision and verification route remains separate.']},
 hours:{title:'A deputy accepts specified work and dates',example:'Aisha provides only the duties and cover period she has explicitly accepted, after the required information and individual access are ready. Availability outside that period requires a separate agreement. Naming her as deputy does not create automatic after-hours availability for her or Daniel.',checks:['The particular cover duties and period are named.','Aisha’s actual acceptance is required.','Information and individual access are checked.','Additional availability requires a separate agreement.']}
};
function clauseWorkshop(a,root){
 if(a.number!==12)return;const field=root.querySelector('.apgi fieldset');if(!field)return;const host=E('section',undefined,null,'clause-workshop');field.after(host);
 const learningScene=field.closest('.learning-scene');if(learningScene)learningScene.dataset.currentNarration='An agreement can appear complete while making promises that nobody has authorised. In this practice, first identify every clause that makes an unsupported or unlimited commitment. Then select one defective clause and write a clearer version in the rewrite box. Explain the permitted work, its limits, the responsible owner and any confirmation still required. Your draft saves automatically. When you compare your rewrite, you will see a possible clause and the important boundaries it preserves. Different wording can be valid. The comparison helps you reflect on your reasoning; it does not automatically mark your writing or award a pass.';
 E('h3','Your rewrite makes one defective clause usable',host);E('p','First consider which clauses above make unsupported promises. Then choose one of the defective clauses below and write a clearer version. Your version should identify the work, its limits, the responsible owner and the confirmation still needed.',host);
 const label=E('label','Clause you will rewrite',host),select=E('select',undefined,label);Object.keys(repairs).forEach(id=>{const option=E('option',a.config.content.options.find(x=>x.id===id).text,select);option.value=id;});select.value=api.get('clause-rewrite-selected')||'all';
 const editLabel=E('label','Your rewritten clause',host),text=E('textarea',undefined,editLabel);text.rows=4;text.maxLength=2400;text.value=api.get('clause-rewrite-'+select.value)||'';
 const status=E('p','Your rewrite saves automatically. You can compare different clauses without losing earlier drafts.',host);status.setAttribute('role','status');
 const comparison=E('section',undefined,host,'clause-rewrite-comparison');comparison.hidden=true;
 select.onchange=()=>{api.set('clause-rewrite-selected',select.value);text.value=api.get('clause-rewrite-'+select.value)||'';comparison.hidden=true;};text.oninput=()=>{api.set('clause-rewrite-'+select.value,text.value);status.textContent='Your rewrite is saved. Compare it with the worked example when you are ready.';};
 field.addEventListener('change',event=>{const option=event.target;if(option.matches('input[type=checkbox]')&&option.checked&&repairs[option.value]){select.value=option.value;select.onchange();status.textContent='You selected this clause above. Its rewrite is now open below; your other drafts remain saved.';}});
 function compare(acknowledge=false){if(!acknowledge&&!text.value.trim()){status.textContent='Please write a proposed clause first, or choose the reflection route to study the comparison.';text.focus();return;}
  const r=repairs[select.value];comparison.hidden=false;comparison.replaceChildren();E('h4',r.title,comparison);E('p','A possible rewritten clause is:',comparison);E('blockquote',r.example,comparison);E('h4','Check these features in your own wording',comparison);const list=E('ul',undefined,comparison);r.checks.forEach(t=>E('li',t,list));E('p','Different wording can be valid if it retains these boundaries. This comparison supports reflection; it does not automatically judge your written response or award a mark.',comparison);B('Open the working-agreement example',()=>openReading({page:23}),comparison);api.set('clause-rewrite-comparison-'+select.value,{at:new Date().toISOString(),reflectionOnly:acknowledge});comparison.scrollIntoView({block:'nearest'});
 }
 B('Compare my rewrite',()=>compare(),host);B('I have considered a rewrite — show the comparison',()=>compare(true),host);
}
function portfolio(a,root){
 if(a.number!==16)return;const panel=root.querySelector('.result');if(!panel)return;const list=panel.querySelector('ul');if(!list)return;const host=E('section',undefined,null,'portfolio-guidance');list.replaceWith(host);
 const learningScene=panel.closest('.learning-scene');if(learningScene)learningScene.dataset.currentNarration='You can now bring your learning together in an open-book practice portfolio. Prepare the five working tools: your executive support brief, working agreement, priority decision brief, handover record and partnership review. Select a tool to open its saved draft, read its instructions in the reference book or revisit the completed fictional learning example. Each example has a return route to this task. You can keep the book in a separate window while you write. Use fictional or sanitised information and keep your starting brief separate from later case confirmations. Preparing these drafts is developmental practice. It is not an assessed submission, a pass or confirmation of workplace competence.';
 E('h3','Your earlier learning supports each part of this portfolio',host);E('p','This is an open-book practice task. You can keep the reading book in another window and use the completed fictional examples while preparing your own tools. Use only fictional or sanitised information. Keep your starting brief separate from later case confirmations.',host);
 const nav=E('div',undefined,host,'portfolio-choice-nav scene-tabs'),cards=[],tabs=[];let selected=api.get('portfolio-tool-selected')||data.tools[0].id;
 const choose=id=>{selected=id;api.set('portfolio-tool-selected',id);cards.forEach(c=>c.hidden=c.dataset.tool!==id);tabs.forEach(t=>{const active=t.dataset.tool===id;t.classList.toggle('active',active);t.setAttribute('aria-pressed',String(active));});};
 for(const t of data.tools){const lesson=toolLessons[t.id],tab=B(t.id+' · '+t.title,()=>choose(t.id),nav);tab.dataset.tool=t.id;tabs.push(tab);const card=E('article',undefined,host,'portfolio-tool-card');card.dataset.tool=t.id;cards.push(card);E('h4',t.id+' · '+t.title,card);E('p',lesson.purpose,card);B('Open my '+t.id+' draft',()=>w.LU1Revision.openTool(t.id),card);B('Read the tool and guidance',()=>openReading({tool:t.id}),card);B('Revisit the guided example',()=>{api.set('guided-return',{activity:16,anchor:w.LU1_CURRENT_SCENE?.anchor||''});go(lesson.activity,lesson.anchor);},card);}
 choose(selected);
 B('Read the practice instructions',()=>openReading({page:35}),host);B('Read the review criteria',()=>openReading({page:36}),host);B('Read the explanatory guidance',()=>openReading({page:37}),host);
}
function accordion(a,root){if(a.number!==9)return;const details=[...root.querySelectorAll('.apgi details[data-item]')];details.forEach(d=>{const summary=d.querySelector('summary');summary.setAttribute('aria-expanded',String(d.open));summary.addEventListener('click',()=>{if(!d.open)for(const other of details)if(other!==d){other.open=false;other.querySelector('summary').setAttribute('aria-expanded','false');}});d.addEventListener('toggle',()=>{summary.setAttribute('aria-expanded',String(d.open));if(d.open)for(const other of details)if(other!==d)other.open=false;});});}
const old=w.LU1Revision.afterMount;
w.LU1Revision.afterMount=function(a,root,sceneApi){api=sceneApi;currentActivity=a.number;old(a,root,sceneApi);initialBriefSupport(a,root);classificationFeedback(a,root);clauseWorkshop(a,root);portfolio(a,root);accordion(a,root);returnSupport(root);readingControl();};
document.addEventListener('lu1-scene-change',()=>{if(api){readingControl();returnSupport($('activity'));}});
w.LU1OwnerReview={openReading,reference,toolSupport,repairs,toolLessons};
})(window);

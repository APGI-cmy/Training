/* Owner review implementation, 27 October 2026. Source workbook is retained.
   Display adaptations below are explicit, inspectable and reversible. */
(function(w){'use strict';
const d=w.LU1_DATA,E=(tag,text,parent,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent?.append(n);return n;};
const B=(text,fn,parent)=>{const n=E('button',text,parent);n.type='button';n.onclick=fn;return n;};
const originalMount=w.LU1LearningScience.mount;
const a=n=>d.activities.find(x=>x.number===n);
w.LU1_REVIEW_REVISION='0.4r1 · 27 October 2026';
// Fictional currency localization is not an exchange-rate conversion. Preserve
// source chapters, source hashes, assessment keys, quantities and conditions.
const localize=s=>typeof s==='string'?s.replace(/a fictional two-thousand-rand limit/g,'a fictional limit of two thousand US dollars').replace(/\bR(?=\s?\d)/g,'USD ').replace(/\brand\b/gi,'US dollars'):s;
function walk(value){if(Array.isArray(value))return value.map(walk);if(value&&typeof value==='object'){const o={};for(const [k,v]of Object.entries(value))o[k]=['src','poster','captions','locator','hash','contentHash','id','source','sources'].includes(k)?v:walk(v);return o;}return localize(value);}
for(const activity of d.activities)Object.assign(activity,walk(activity));
// The quiz wording uses the same fictional denomination; scoring keys and
// numerical comparisons are unchanged. Original JSON remains authoritative.
d.quiz=d.quiz.map(walk);
for(const [id,clip]of Object.entries(w.LU1_AUDIO_MANIFEST.clips)){for(const k of ['text','transcriptText'])if(clip[k])clip[k]=localize(clip[k]);}
for(const clip of Object.values(w.LU1_MEDIA_MANIFEST.videos))for(const k of ['text','transcriptText'])if(clip[k])clip[k]=localize(clip[k]);
for(const id of Object.keys(w.LU1_LEARNING_PLAN.toolExamples))w.LU1_LEARNING_PLAN.toolExamples[id]=w.LU1_LEARNING_PLAN.toolExamples[id].map(localize);
const terms=[
 ['planning','Planning means deciding the intended result, the actions, people, information, resources and timing needed, and how progress and changes will be checked.'],
 ['diary management','Diary management is an application of planning: appointments, preparation time, travel and other commitments must fit the intended result and the people involved.'],
 ['stakeholder','A stakeholder is a person or function whose work, decision or interests affect or are affected by the plan. Their availability and acceptance cannot be assumed.'],
 ['CEFR','The Common European Framework of Reference for Languages (CEFR) describes language proficiency. This learning activity does not measure or assign a CEFR level.'],
 ['EA','Executive assistant (EA): the person coordinating the executive-support work actually assigned and delegated. The title alone does not grant decision authority.'],
 ['PA','Personal assistant (PA): a support role whose actual responsibilities must be agreed; they may overlap with an executive assistant’s work.'],
 ['EPO','Executive protection officer (EPO): a person providing protective input within an actual mandate, not a universal power over other functions.'],
 ['USD','United States dollars (USD). This teaching edition uses fictional USD amounts with the same numbers as the original case. This is not a currency conversion, market rate or workplace spending policy.'],
 ['supplier exception','A supplier exception is a request to depart from the organisation’s normal supplier requirements or process. It still needs the appointed approver; executive access is not approval.'],
 ['decision meeting','In this fictional case, the 10:00–10:45 meeting is for Lindiwe to make a service-investment decision using the papers supplied by finance and operations. Daniel coordinates readiness; he does not make the investment decision.'],
 ['T1.1','T1.1 is the executive support brief: the working template for the intended result, deliverable, input owners, readiness evidence, review point and capacity needs. Open Tools and examples to complete your own draft beside the lesson.']
];
for(const [term,meaning]of terms){const old=d.glossary.find(g=>g.term.toLowerCase()===term.toLowerCase());if(old)old.meaning=meaning;else d.glossary.push({term,meaning});}
a(1).learningScene.bridge='In this learning unit, you will learn how planning creates a reliable executive-support partnership. Diary management is one practical application: your plan must fit the executive’s commitments and the plans of everyone who contributes.';
a(1).learningScene.knownToNew='A busy calendar does not show whether the right people are available, the necessary papers are ready, or a change has been approved. You will practise checking these conditions and recording them in a working agreement and a decision brief.';
a(3).learningScene.bridge='In the previous activity, you identified what is known and what remains unconfirmed in Daniel’s Monday requests. You will now use that information to prepare an executive support brief, the working document labelled T1.1.';
a(3).learningScene.knownToNew='Lindiwe’s decision meeting runs from 10:00 to 10:45 and concerns a service investment. Finance and operations supply the papers; Daniel coordinates the pack and preparation. In this activity, you will identify what the pack must contain, who supplies each input and what evidence shows that it is ready. You can complete your own T1.1 draft beside the lesson.';
a(3).config.instruction=a(3).config.content.prompt='Using the executive support brief (T1.1), what should Daniel have ready before Lindiwe’s service-investment decision meeting, who must supply the inputs, and what evidence will show they are ready?';
const steps=[
 ['The brief starts with the intended result','The purpose of Lindiwe’s meeting is an informed service-investment decision. Daniel records that purpose in the business-purpose field of T1.1. Sending invitations is an activity; assembling a controlled meeting pack is an output. Neither proves that Lindiwe has made the decision.'],
 ['The timing must support a useful decision','Daniel checks why the decision is needed at this time and what would happen if it were delayed. He records the intended result and review point in T1.1. The preparation period and the meeting are separate commitments, so a conflicting appointment affects both.'],
 ['The brief identifies the executive’s contribution','Lindiwe makes the investment decision within her authority. Daniel identifies the contribution that actually needs her time. Finance and operations remain responsible for their submissions; Daniel’s role is to coordinate them and make readiness gaps visible.'],
 ['Readiness depends on identifiable evidence','Daniel specifies the controlled agenda, current referenced papers, participants and preparation required. An unapproved financial appendix is still a gap. In the deliverable-and-evidence field of T1.1, he records what is ready, what is missing and why the missing input matters.'],
 ['Each input needs an agreed owner','Daniel identifies who will supply each paper, when it is needed and where its current version will be kept. He checks that the people involved can meet the plan. If several executives share his time, he makes the capacity conflict visible instead of assuming that all requests can be completed.'],
 ['The review point allows gaps to be resolved','Before the protected preparation period, Daniel proposes a review of the pack’s readiness. If an input is late or unapproved, he identifies its owner and consequence and seeks the required decision. His T1.1 draft brings together the result, deliverable, owners, review point and capacity needs.']
];
a(3).config.content.items.forEach((x,i)=>{x.title=steps[i][0];x.body=steps[i][1];if(x.media)x.media.alt=x.title;});
a(4).config.content.prompt='A manager asks Daniel to approve a supplier exception because he has direct executive access. Here, a supplier exception means a request to depart from the normal supplier process or requirements. No approval authority for that departure has been delegated to Daniel. How can he help the request reach the appointed approver without approving it himself?';
a(4).config.content.guidance='Daniel can identify the appointed approver, collect the reason for the requested departure and its deadline, and route the request through the proper process. He can keep the manager informed of its pending status. Direct access to Lindiwe does not authorise him to approve the exception.';
a(4).learningScene.knownToNew+=' A personal assistant (PA) may have overlapping support responsibilities; the actual work and permission must be agreed rather than inferred from either title.';
a(7).learningScene.knownToNew+=' In this teaching edition, United States dollars (USD) replace the original case denomination. The fictional limit remains 2,000 with the same conditions. This is a teaching localization, not an exchange-rate conversion or a real workplace spending policy.';
a(8).learningScene.bridge='You have checked the authority and information conditions for accepting work. You will now apply planning to Daniel’s diary: the supplier’s proposed 09:45–10:15 appointment overlaps both preparation and the service-investment decision meeting.';
a(9).learningScene.bridge='In the previous activity, you found that the supplier’s proposed appointment overlaps fifteen minutes of preparation and fifteen minutes of the decision meeting. You will now compare possible solutions and explain which decision or acceptance each solution still needs.';
a(9).learningScene.knownToNew='Daniel must help Lindiwe choose a workable arrangement, not promise that a proposal has already been approved. Each panel below explains an option, its effect on the existing plan and the conditions that must be checked. You will use this reasoning in the priority decision brief in the next activity.';
const options={
 operations:['An operations-led discussion may preserve the morning plan','Daniel could recommend that the appointed operations owner handle the supplier discussion. This would protect Lindiwe’s preparation and decision meeting, but only if the discussion falls within that person’s delegation and the person accepts the assignment. Lindiwe’s approval must also be obtained where required. These conditions are not supplied as confirmed facts.'],
 later:['A later appointment may avoid the current conflict','Daniel could investigate a later slot for Lindiwe and ask when the supplier actually needs the decision. He must check availability, the supplier’s acceptance and the latest useful decision time before recommending a particular arrangement. A possible slot is not a confirmed appointment.'],
 change:['A change to the protected commitments needs Lindiwe’s decision','If Lindiwe considers changing the morning plan, Daniel explains the preparation time that would be lost and the effects on other participants and papers. He asks for the authorised decision rather than treating the change as routine diary administration.'],
 assume:['The supplier’s claim does not confirm the appointment','The supplier says that 09:45 has been approved, but the approval has not been verified and the slot conflicts with two commitments. Daniel must keep the appointment pending, check the claim with the appointed decision-maker and explain the conflict.'],
 correct:['An incorrect impression of confirmation needs a visible correction','If Daniel has already sent a message that implies the slot is confirmed, he explains the correction to the affected recipients: the slot remains pending, the claimed approval is being checked, and the conflicts still need a decision. He updates the current controlled record so that people do not act on the earlier misunderstanding. Quietly replacing an attachment would not reliably correct what recipients believe.'],
 conditional:['A physical lunch requires several separate confirmations','A business decision in favour of a physical lunch does not establish protective arrangements, transport or monitoring acceptance. Daniel keeps each condition visible and obtains confirmation from the appointed owner. Existing afternoon arrangements do not automatically cover the proposed lunch.'],
 virtual:['Retaining the virtual discussion is an option to recommend','Daniel may recommend keeping the virtual discussion because it avoids new travel and service dependencies and protects the existing programme. He explains those reasons to Lindiwe and asks for the business decision. The recommendation is not an already agreed case outcome.'],
 guarantee:['Reading the message does not confirm the lunch arrangements','Thandi may have seen the message without approving protective arrangements or accepting any service assignment. Daniel cannot tell the client that lunch is confirmed on that basis. He checks the separate decisions and acceptances and reports their actual status.']
};
a(9).config.content.items.forEach(x=>{[x.title,x.body]=options[x.id];if(x.media)x.media.alt=x.title;});
// Map legacy item controls to revised prose, never to stale audio scripts.
for(const x of d.activities){const id='D'+String(x.number).padStart(2,'0');for(const item of x.config?.content?.items||[]){const clip=w.LU1_AUDIO_MANIFEST.clips[id+'-'+item.id];if(clip){clip.text=[item.title,item.body||item.text].filter(Boolean).join('. ');clip.transcriptText=clip.text;}}for(const k of ['prompt','guidance']){const clip=w.LU1_AUDIO_MANIFEST.clips[id+'-'+k];if(clip&&x.config?.content?.[k])clip.text=clip.transcriptText=x.config.content[k];}}
let api,drawer,selection='T1.1';
function openTool(id=selection){selection=typeof id==='string'?id:selection;
 if(!drawer){drawer=E('aside',undefined,document.body,'working-tool');drawer.id='working-tool';drawer.setAttribute('aria-label','Editable working toolkit');}
 drawer.hidden=false;drawer.replaceChildren();const head=E('header',undefined,drawer);E('h2','Your working toolkit',head);B('Minimise',()=>{drawer.hidden=true;document.body.classList.remove('working-tool-open');},head);
 const label=E('label','Your tool',drawer),select=E('select',undefined,label);d.tools.forEach(t=>{const o=E('option',t.id+' · '+t.title,select);o.value=t.id;});select.value=selection;select.onchange=()=>openTool(select.value);
 const tool=d.tools.find(t=>t.id===selection)||d.tools[0];selection=tool.id;
 E('p','You can complete this draft while moving through the lesson. Your entries save automatically in this browser; they are not submitted or assessed.',drawer);
 const ex=E('details',undefined,drawer);E('summary','Completed fictional example',ex);w.LU1LearningScience.toolExample(tool.id,ex);
 tool.fields.forEach((f,i)=>{const l=E('label',f,drawer),ta=E('textarea',undefined,l);ta.rows=3;ta.maxLength=1200;ta.dataset.draftKey=tool.id+'-'+i;ta.value=api.get(ta.dataset.draftKey)||'';ta.oninput=()=>{api.set(ta.dataset.draftKey,ta.value);if(tool.id==='T1.3'&&[...drawer.querySelectorAll('textarea')].map(x=>x.value).join(' ').trim().length>=20)api.markFirstBrief?.();drawer.querySelector('[role=status]').textContent='Draft saved locally. No assessment submission has been made.';};});
 const link=E('a','Optional blank text template',drawer);link.href='assets/'+tool.id+'-blank.txt';link.download=tool.id+'-blank.txt';
 w.LU1OwnerReview?.toolSupport(drawer,tool);const status=E('p','Drafts save automatically. No export/import is needed.',drawer);status.setAttribute('role','status');document.body.classList.add('working-tool-open');
}
function section(root,id,title,paragraphs){const s=E('section',undefined,null,'ls-card');s.id=id;E('h2',title,s);paragraphs.forEach(t=>E('p',t,s));root.prepend(s);return s;}
w.LU1LearningScience.mount=function(activity,root,sceneApi){api=sceneApi;originalMount(activity,root,sceneApi);
 if(activity.number===1){
  section(root,'planning-diary','Diary management puts the shared plan into practice',[
   'Diary management is more than finding an empty calendar slot. The executive may need preparation time, a decision-ready pack, travel time and contributions from other people. A new appointment must be checked against those commitments and the purpose they serve.',
   'In the fictional Meridian case, Lindiwe needs time to prepare for a service-investment decision meeting. Daniel, her executive assistant (EA), coordinates the plan. Finance and operations supply papers, Thandi, the executive protection officer (EPO), provides protective input within her mandate, and Aisha may provide cover only for work she has accepted.',
   'You will use this connected plan throughout LU1. First you will distinguish known facts from assumptions, then prepare the executive support brief (T1.1), examine authority and diary conflicts, recommend workable options and develop a working agreement. Each new task uses information or a work product from the preceding learning.'
  ]);
  section(root,'planning-foundations','Planning connects your work to other people’s plans',[
   'Planning means deciding what result is needed and working out the actions, people, information, resources and timing required to achieve it. A useful plan also identifies how progress will be checked and what must happen when a condition changes.',
   'Your plan affects other people. A stakeholder is a person or function whose work, decision or interests affect or are affected by the plan. Before promising a time or result, you check their existing commitments, the inputs they must supply and whether they have accepted the work. The parts must fit together like a puzzle; an empty space in your diary is not evidence that everyone else is ready.',
   'For example, a decision meeting depends on more than an invitation. The executive needs preparation time, finance and operations need time to supply current papers, and Daniel needs a review point to identify gaps. If one input is late, the people responsible must understand the effect and agree the next action. Planning makes those dependencies visible rather than leaving others to discover a conflict.'
  ]);
  const p=root.querySelector('#ls-diagnostic>p');if(p)p.textContent='This short readiness activity is ungraded. It is not a language-proficiency test under the Common European Framework of Reference for Languages (CEFR), and it is not an adult-literacy assessment. Choose what you think before opening the explanation.';
 }
 if(activity.number===6){const g=root.querySelector('#ls-concept .ls-compare');const p=E('p','The two situations below help you decide whether Daniel is permitted to act. In the first, all conditions of the supplied delegation are met. In the second, system access exists but decision authority does not. Compare the permission and conditions, not how easy the action would be to carry out.');g?.before(p);}
 for(const s of root.querySelectorAll('[id^=ls-worked]')){const toolId=s.id.includes('agreement')?'T1.2':s.id.includes('cover')?'T1.4':s.id.includes('review')?'T1.5':activity.number===10?'T1.3':'T1.1';const p=E('p',toolId==='T1.1'?'T1.1 is the executive support brief you are learning to complete. Each field turns the meeting purpose into an agreed deliverable, owner, readiness check or review point. You can study the example and complete your own brief alongside it.':'This completed example shows how the named working tool supports the task. You can keep your own draft open while continuing the lesson.',s);const open=B('Open '+toolId+' beside the lesson',()=>openTool(toolId),s);s.querySelector('details')?.before(open);}
};
w.LU1Revision={openTool,localize,afterMount(activity,root,sceneApi){api=sceneApi;
 document.title='LU1 owner-review revision · 27 October 2026';
 if(w.LU1_REVIEW_MODE)document.querySelector('.test-ribbon').textContent='OWNER-REVIEW REVISION 0.4r1 · 27 OCTOBER 2026 · NOT RELEASED';
 document.getElementById('tools').onclick=()=>openTool();
 const diagnostic=root.querySelector('#ls-diagnostic');if(diagnostic){const b=[...diagnostic.querySelectorAll('button')].find(b=>b.textContent==='Check my starting reasoning');b?.addEventListener('click',()=>{const feedback=diagnostic.querySelector('[aria-live]');if(feedback?.textContent.trim())w.LU1Scenes.playText(feedback.textContent,true);});}
 if(activity.number===7)for(const l of root.querySelectorAll('.choice-card'))l.querySelectorAll('button').forEach(b=>b.remove());
 // A short category label is not an answer-option narration task.
 if(activity.number===7)for(const b of root.querySelectorAll('.choice-card button'))b.remove();
}};
})(window);

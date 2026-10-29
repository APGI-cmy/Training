import React from 'react';
import {readFileSync,writeFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {activeFindings,canWork,findingAppliesToUnit,type ReviewRound} from '@/lib/course-review';
import {canEndorseFinding,canImplement,designerEmail,findingPhase,luReviewStages} from '@/lib/lu-review-workflow';
const view=vi.hoisted(()=>({unit:'',stage:'initial'}));
vi.mock('react',async()=>{const actual=await vi.importActual<typeof import('react')>('react');return {...actual,useState:(initial:unknown)=>actual.useState(initial===null?view.unit:initial==='initial'?view.stage:initial)};});
vi.mock('next/link',()=>({default:({href,children}:{href:string;children:React.ReactNode})=><a href={href}>{children}</a>}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/server/actions/course-reviews',()=>({courseReviewAction:vi.fn(),createCourseReview:vi.fn()}));
vi.mock('@/server/actions/publication-workflow',()=>({publicationWorkflowAction:vi.fn()}));
vi.mock('@/server/actions/lu-review-workflow',()=>({luReviewAction:vi.fn()}));
vi.mock('@/server/actions/notifications',()=>({notificationAction:vi.fn()}));
vi.mock('@/components/notifications/NotificationSentMessages',()=>({NotificationSentMessages:()=>null}));
import {LUReviewWorkspace} from '@/components/reviews/LUReviewWorkspace';
import {cleanReviewRound} from './fixtures/clean-review';

describe('No-findings designer and reviewer modal views',()=>{
 it.each([2,5])('shows four green stages and no endorsement controls for a unanimous %i-person team',count=>{
  const round=cleanReviewRound(count);view.unit='lu1';
  for(const actor of round.document.participants)for(const stage of luReviewStages(round,'lu1')){
   view.stage=stage.id;const html=renderToStaticMarkup(<LUReviewWorkspace round={round} email={actor.email} userId={actor.userId!} fresh/>);
   expect((html.match(/class="lu-workflow-step" data-complete="true"/g)??[])).toHaveLength(4);expect(html).toContain('No review findings were raised');expect(html).toContain('No findings — review complete');expect(html).not.toContain('Submit endorsement decision');expect(html).not.toContain('one additional endorsement recorded');expect(html).not.toContain('No peer endorsements received yet');
  }
 });
});

// Optional read-only audit of a separately captured live snapshot. Private data is
// never committed, and no server action or network request is executed by this test.
const rows:ReviewRound[]=process.env.LU_REVIEW_AUDIT_FILE?JSON.parse(readFileSync(process.env.LU_REVIEW_AUDIT_FILE,'utf8')):[];
const matrix:unknown[]=[];
describe.skipIf(!rows.length)('Captured live review modal audit',()=>{
 for(const round of rows.filter(r=>r.status==='open'))for(const unit of round.document.units){
  const participants=round.document.participants.filter(p=>p.state!=='declined');
  const actors=[...participants.map(p=>({email:p.email,userId:p.userId??`unclaimed:${p.email}`}))];
  if(!actors.some(p=>p.email===designerEmail(round.document)))actors.push({email:designerEmail(round.document),userId:round.document.requesterId});
  for(const actor of actors)it(`${round.course_id}/${unit.slug}/${actor.email}: all four role-specific stages`,()=>{
   const before=JSON.stringify(round),findings=activeFindings(round.document).filter(f=>findingAppliesToUnit(f,unit.slug)),stages=luReviewStages(round,unit.slug);
   view.unit=unit.slug;
   for(const stage of stages){
    view.stage=stage.id;const html=renderToStaticMarkup(<LUReviewWorkspace round={round} email={actor.email} userId={actor.userId} fresh/>);
    expect(html).toContain(`${unit.slug.toUpperCase()} · ${unit.title.replaceAll('&','&amp;')}`);
    const buttons=[...html.matchAll(/class="lu-workflow-step" data-complete="(true|false)"/g)].map(m=>m[1]==='true');expect(buttons).toEqual(stages.map(s=>s.done));
    const expected=stage.id==='endorsements'&&canWork(round)?findings.filter(f=>canEndorseFinding(round,f,actor.email,actor.userId)).length:0;
    expect((html.match(/Submit endorsement decision/g)??[]).length).toBe(expected);
    if(!findings.some(f=>canImplement(round,f,actor.email,actor.userId)))expect(html).not.toContain('Submit implementation (');
    expect(html).not.toContain('I also independently endorse');expect(html).not.toContain('Submit reviewer decision');
   }
   expect(JSON.stringify(round)).toBe(before);
   matrix.push({course:round.course_id,round:round.id,revision:round.revision,unit:unit.slug,title:unit.title,actor:actor.email,stages:stages.map(s=>({stage:s.id,complete:s.done})),records:findings.map(f=>({id:f.id,reference:f.reference,author:f.author,phase:findingPhase(round,f),canImplement:canImplement(round,f,actor.email,actor.userId),canEndorse:canEndorseFinding(round,f,actor.email,actor.userId)}))});
  });
 }
 it('writes the local audit matrix only when an output path is supplied',()=>{expect(matrix.length).toBeGreaterThan(0);if(process.env.LU_REVIEW_AUDIT_OUTPUT)writeFileSync(process.env.LU_REVIEW_AUDIT_OUTPUT,JSON.stringify({capturedAt:new Date().toISOString(),roleUnitViews:matrix.length,stageViews:matrix.length*4,matrix},null,2));});
});

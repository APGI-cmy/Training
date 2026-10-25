import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {observeReviewSlides,reviewFindingLocation,courseWideReference,registerReviewSlideSession,playerBelongsToReview,type ReviewSlideHost,type ReviewPresentationPlayer} from '@/lib/review-slide';
import {findingAppliesToUnit,recordFinding,type ReviewDocument,type ReviewFinding} from '@/lib/course-review';
import {screenshotError} from '@/lib/review-screenshot';
vi.mock('@/components/reviews/ReviewForms',()=>({ReviewForm:({children}:{children:React.ReactNode})=><form>{children}</form>}));
import {ReviewPanel} from '@/components/reviews/ReviewPanel';

describe('Automatic slide reference and shared course findings',()=>{
 it('reads the initial zero-based player index and follows changes without controlling playback',()=>{
  let index=0,handler:(()=>void)|undefined;
  const removeHandler=vi.fn(),changed=vi.fn();
  const player:ReviewPresentationPlayer={view:()=>({playbackController:()=>({currentSlideIndex:()=>index,slideChangeEvent:()=>({addHandler:h=>{handler=h;},removeHandler})})}),presentation:()=>({slides:()=>({getSlide:()=>({title:()=>`Slide title ${index+1}`})})})};
  const stop=observeReviewSlides(player,changed);
  expect(changed).toHaveBeenLastCalledWith({number:1,title:'Slide title 1'});
  index=4;handler!();expect(changed).toHaveBeenLastCalledWith({number:5,title:'Slide title 5'});
  index=-1;handler!();expect(changed).toHaveBeenLastCalledWith(null);
  stop();expect(removeHandler).toHaveBeenCalledWith(handler);
 });
 it('builds current-slide references and rejects missing/invalid slide numbers',()=>{
  expect(reviewFindingLocation('current','7',' Video\n captions ')).toEqual({scope:'current',reference:'Slide 7: Video captions'});
  for(const number of ['','0','-1','1.5','not a slide'])expect(()=>reviewFindingLocation('current',number,'')).toThrow(/current slide/);
  expect(()=>reviewFindingLocation('unknown','1','')).toThrow(/Choose/);
 });
 it('represents all slides once and makes that finding available in every LU',()=>{
  const shared={id:'shared',unit:'lu1',author:'a@example.com',userId:'a',reference:courseWideReference,scope:'course',replies:[],at:'now',status:'open',text:'Caption all clips',category:'Accessibility',blocking:true} as ReviewFinding;
  const doc={findings:[]} as unknown as ReviewDocument;recordFinding(doc,shared);
  for(const unit of ['lu1','lu2','lu8'])expect(findingAppliesToUnit(shared,unit)).toBe(true);
  expect(findingAppliesToUnit({...shared,scope:'current'},'lu2')).toBe(false);
  expect(doc.findings).toHaveLength(1);
  expect(()=>recordFinding(doc,{...shared,id:'duplicate',unit:'lu2'})).toThrow(/keep all/);
 });
 it('retains scope, replies and evidence in the shared finding audit history',()=>{
  const shared={id:'shared',unit:'lu1',author:'a@example.com',reference:courseWideReference,scope:'course',replies:[{email:'b@example.com',text:'Check LU2 as well'}],at:'now',status:'open',text:'Old request',category:'Accessibility',attachment:'private.png',blocking:false} as ReviewFinding;
  const doc={findings:[shared]} as ReviewDocument;
  recordFinding(doc,{...shared,text:'Clarified request',at:'later'},'shared');
  expect(doc.findings[0].previousVersions?.[0]).toMatchObject({scope:'course',text:'Old request',attachment:'private.png'});
  expect(doc.findings[0].replies).toHaveLength(1);
 });
 it('offers two scope choices, an automatic reference and pasted screenshot controls',()=>{
  const html=renderToStaticMarkup(<ReviewPanel id="r" unit="lu1" canEdit email="a@example.com" hasEbook={false}/>);
  expect(html).toContain('Current slide');expect(html).toContain('Applicable to all slides');
  expect(html).not.toContain('Slide / quiz / question / e-book page reference');expect(html).not.toContain('Take a snapshot');
  expect(html).toContain('Paste screenshot');expect(html).toContain('Ctrl+V');
 });
 it('validates pasted screenshots before attaching them',()=>{
  expect(screenshotError({type:'image/png',size:100})).toBe('');
  expect(screenshotError({type:'text/html',size:100})).toMatch(/PNG/);
  expect(screenshotError({type:'image/png',size:3*1024*1024})).toMatch(/2 MB/);
 });
 it('separates this LU from course-wide findings and excludes a different LU',()=>{
  const f={id:'local',unit:'lu6',author:'a@example.com',userId:'a',reference:'Slide 2',replies:[],at:'now',status:'open',text:'Only LU6',category:'Content',blocking:false} as ReviewFinding;
  const html=renderToStaticMarkup(<ReviewPanel id="r" unit="lu6" canEdit email="a@example.com" hasEbook={false} findings={[f,{...f,id:'shared',unit:'lu5',scope:'course',text:'All units'},{...f,id:'other',unit:'lu5',text:'Only LU5 — must not appear'}]}/>);
  expect(html).toContain('Saved feedback for LU6 only (1)');expect(html).toContain('Course-wide findings — all LUs (1)');
  expect(html).toContain('Only LU6');expect(html).toContain('All units');expect(html).not.toContain('Only LU5 — must not appear');
 });
 it('rejects a previous player document even when it registers after the new LU opens',()=>{
  const currentDocument={},oldDocument={};
  const root={querySelectorAll:()=>[{contentDocument:currentDocument}]} as unknown as HTMLElement;
  const player=(doc:object)=>({view:()=>({displayObject:()=>({ownerDocument:doc})})} as unknown as ReviewPresentationPlayer);
  expect(playerBelongsToReview(player(currentDocument),root)).toBe(true);
  expect(playerBelongsToReview(player(oldDocument),root)).toBe(false);
 });
 it('does not forward a new player to an old tracker and ignores retired callbacks',()=>{
  const host:ReviewSlideHost={},oldPlayer={} as ReviewPresentationPlayer;
  const oldChange=vi.fn(),newChange=vi.fn();
  const stopOld=registerReviewSlideSession(host,p=>p===oldPlayer,oldChange),oldConnector=host.ispringPresentationConnector!;
  let handler:(()=>void)|undefined,index=0;const removeHandler=vi.fn();
  const newPlayer:ReviewPresentationPlayer={view:()=>({playbackController:()=>({currentSlideIndex:()=>index,slideChangeEvent:()=>({addHandler:h=>{handler=h;},removeHandler})})}),presentation:()=>({slides:()=>({getSlide:()=>({title:()=>''})})})};
  const stopNew=registerReviewSlideSession(host,p=>p===newPlayer,newChange);
  host.ispringPresentationConnector!.register(oldPlayer);expect(newChange).not.toHaveBeenCalled();
  host.ispringPresentationConnector!.register(newPlayer);expect(newChange).toHaveBeenLastCalledWith({number:1,title:''});expect(oldChange).not.toHaveBeenCalled();
  stopOld();oldConnector.register(oldPlayer);expect(oldChange).not.toHaveBeenCalled();
  index=1;handler!();expect(newChange).toHaveBeenLastCalledWith({number:2,title:''});
  stopNew();newChange.mockClear();handler!();expect(newChange).not.toHaveBeenCalled();expect(host.ispringPresentationConnector).toBeUndefined();
 });
});

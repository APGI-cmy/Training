import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const effects=vi.hoisted(()=>[] as Array<()=>void|(()=>void)>);
vi.mock('react',async load=>({...await load<typeof import('react')>(),useEffect:(fn:()=>void|(()=>void))=>effects.push(fn)}));
import {getCourseBySlug,encodeAssetPath} from '@/lib/courses';
import {getUnitContent} from '@/lib/services/courses/get-unit-content';
import {ScormPlayer} from '@/components/course/ScormPlayer';
import {PreviewCourseResources} from '@/components/course/PreviewCourseResources';
import {readPreviewProgress} from '@/components/course/PreviewProgress';
const slug='executive-assistant-lu1-compatibility',root=resolve('public/courses/Executive Assistant Training Programme'),req=createRequire(import.meta.url);
const adapter=req(root+'/course/scorm-adapter.js'),core=req(root+'/course/assessment-core.js'),data=JSON.parse(readFileSync(root+'/course/course-data.json','utf8'));
beforeEach(()=>{effects.length=0;const store=new Map<string,string>();vi.stubGlobal('sessionStorage',{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v)});vi.stubGlobal('window',Object.assign(new EventTarget(),{API_1484_11:undefined}));});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()});
function install(scope='pilot:user:release') {effects.length=0;renderToStaticMarkup(<ScormPlayer courseSlug={slug} unitSlug='lu1' unitId='ea-lu1-compatibility-unit-1' launchSrc={encodeAssetPath(getUnitContent(slug,'lu1')!.unit.scormPath!)} title='The executive partnership' mode='preview' previewScope={scope}/>);return effects[0]() as ()=>void;}
describe('Executive Assistant LU1 compatibility pilot',()=>{
 it('registers one LU with the supplied folder, native quizzes, reading book and publication blockers',()=>{const c=getCourseBySlug(slug)!;expect(c.catalogueVisibility).toBe('client_specific');expect(c.publicationIssues!.length).toBeGreaterThan(0);expect(c.units).toHaveLength(1);expect(c.units[0].quiz).toEqual([]);const u=getUnitContent(slug,'lu1')!;expect(u.unit.scormPath).toBe(c.sourceRoot+'/course/index.html');expect(u.originalContentHref).toBe(c.sourceRoot+'/course/ebook.html');for(const p of [c.welcomePath!,u.originalContentHref,u.unit.scormPath!])expect(existsSync(resolve('public',decodeURIComponent(p).slice(1))),p).toBe(true);expect(encodeAssetPath(c.sourceRoot)).not.toContain('%2520');});
 it('retains all SCORM manifest references and the 2004 entry point',()=>{const xml=readFileSync(root+'/imsmanifest.xml','utf8');expect(xml).toContain('2004');expect(xml).toContain('href="course/index.html"');const files=[...xml.matchAll(/<file\s+href="([^"]+)"/g)].map(x=>x[1]);expect(files).toHaveLength(2366);for(const file of files)expect(existsSync(resolve(root,decodeURIComponent(file))),file).toBe(true);});
 it.each(['/admin/courses/'+slug+'/preview','/course-reviews/review-id'])('routes welcome continuation through the authenticated preview %s',base=>{const preview={scope:'pilot',courseHref:base,unitBaseHref:base.startsWith('/admin')?base:base+'/units',returnHref:'/catalogue',returnLabel:'Back'};const markup=renderToStaticMarkup(<PreviewCourseResources course={getCourseBySlug(slug)!} preview={preview}/>);expect(markup).toContain(preview.unitBaseHref+'/lu1/activity');expect(markup).toContain('Watch course welcome');expect(markup).toContain('course/ebook.html');expect(markup).not.toContain('executable');});
 it('uses the real package adapter to save and resume attempts and drafts without learner API writes',()=>{const network=vi.spyOn(globalThis,'fetch');let cleanup=install();const state=core.initial(data);state.position=12;state.drafts={'T1.2':'Fictional practice draft'};core.start(state,data);core.submit(state,data,data.quiz[0].id,data.quiz[0].key);const transport=adapter.create(window);expect(transport.mode).toBe('lms');expect(transport.save(state,data).ok).toBe(true);cleanup();cleanup=install();const resumed=adapter.create(window);expect(resumed.get('cmi.entry')).toBe('resume');expect(JSON.parse(resumed.get('cmi.suspend_data'))).toEqual(state);expect(network).not.toHaveBeenCalled();cleanup();});
 it('keeps attendance-only and unfinished outcomes separate from pass completion',()=>{const cleanup=install(),state=core.initial(data);state.courseProgression={attendanceOnly:true};state.quiz.score=100;expect(adapter.create(window).save(state,data).ok).toBe(true);expect(readPreviewProgress('pilot:user:release').completed).toEqual([]);expect(window.API_1484_11!.GetValue).toBeTypeOf('function');cleanup();});
 it('cannot resume another account or release preview',()=>{let cleanup=install();const state=core.initial(data);state.position=8;adapter.create(window).save(state,data);cleanup();cleanup=install('other-user:pilot:release');expect(adapter.create(window).get('cmi.suspend_data')).toBe('');cleanup();});
});

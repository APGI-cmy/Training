import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {inflateSync} from 'node:zlib';
import {describe,it,expect} from 'vitest';
import {getUnitContent} from '@/lib/services/courses/get-unit-content';
const root=resolve('public/courses/vpshr-level-0/LU9 Role-of-security');
const html=readFileSync(join(root,'res/index.html'),'utf8');
const presentation=JSON.parse(inflateSync(Buffer.from(html.match(/var presInfo = "([^"]+)"/)![1],'base64')).toString());
describe('Republished LU9 Role of Security SCORM integration',()=>{
 it('launches the SCORM resource and resolves every manifest and catalogue asset',()=>{
  const content=getUnitContent('vpshr-level-0','lu9')!;
  expect(content.embeddedContentHref).toBe('/courses/vpshr-level-0/LU9 Role-of-security/res/index.html');
  expect(content.originalContentHref).toBe(content.embeddedContentHref);
  const manifest=readFileSync(join(root,'imsmanifest.xml'),'utf8');
  expect(manifest).toContain('2004 4th Edition');expect(manifest).toContain('href="res/index.html"');
  const assets=[...manifest.matchAll(/<file\s+href="([^"]+)"/g)].map(m=>m[1]);expect(assets).toHaveLength(1155);
  for(const file of assets){expect(relative(root,resolve(root,file)).startsWith('..')).toBe(false);expect(existsSync(join(root,file)),file).toBe(true);}
  for(const media of content.unit.media){if(media.src)expect(existsSync(join('public',media.src)),media.src).toBe(true);if('poster' in media&&media.poster)expect(existsSync(join('public',media.poster)),media.poster).toBe(true);}
  for(const slide of content.unit.slides)if(slide.thumbnail)expect(existsSync(join('public',slide.thumbnail)),slide.thumbnail).toBe(true);
  expect(html).toContain('iSpring.LMS.create("ISPRING_LMS_ID", "2004"');
  expect(content.unit.quiz).toHaveLength(0);
 });
 it('retains all authored slides, quizzes and interactions',()=>{
  expect(presentation.s).toHaveLength(44);
  expect(readdirSync(join(root,'res/data')).filter(n=>/^quiz\d+\.js$/.test(n))).toHaveLength(16);
  expect(readdirSync(join(root,'res/data')).filter(n=>/^intr\d+\.js$/.test(n))).toHaveLength(10);
  for(const f of ['quiz1.js','quiz16.js','intr1.js','intr10.js'])expect(readFileSync(join(root,'res/data',f)).length).toBeGreaterThan(100);
 });
 it('preserves bookmarks and the review query on the previous root launch URL',()=>{
  const redirect=readFileSync(join(root,'index.html'),'utf8');expect(redirect).toContain('content="0;url=res/index.html"');expect(redirect).toContain('location.search+location.hash');expect(redirect).not.toContain('<iframe');
 });
});

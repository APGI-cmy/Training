import {beforeEach,describe,expect,it,vi} from 'vitest';
const rest=vi.hoisted(()=>vi.fn());
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:rest}));
vi.mock('@/server/services/course-card-images',()=>({getSavedCourseCardImages:async()=>({})}));
import {getPublicCatalogue} from '@/server/services/public-course-catalogue';

describe('Public catalogue publication boundary',()=>{
 beforeEach(()=>{rest.mockReset();});
 function respond({hidden=false,published=true,release=true}={}){
  rest.mockImplementation(async(path:string)=>{
   if(path.includes('/organisations?'))return Response.json([{id:'apgi-org',slug:'apgi',is_active:true}]);
   if(path.includes('/course_catalogue_settings?'))return Response.json([{course_id:'vpshr-level-0',visibility:hidden?'client_specific':'public'}]);
   if(path.includes('/organisation_offerings?'))return Response.json([{course_id:'vpshr-level-0',status:published?'published':'draft',reviewed_release_id:release?'reviewed':null}]);
   throw Error('Unexpected lookup');
  });
 }
 it('publishes only reviewed public offerings and exposes summary fields only',async()=>{
  respond();const feed=await getPublicCatalogue();expect(feed.courses.map(c=>c.slug)).toEqual(['vpshr-level-0']);
  expect(Object.keys(feed.courses[0]).sort()).toEqual(['cover','description','duration','href','level','slug','title']);
  expect(JSON.stringify(feed)).not.toMatch(/reviewed_release_id|apgi-org|accessToken|object_path|quiz|answer/);
  expect(rest.mock.calls.find(([p])=>p.includes('/organisation_offerings?'))?.[0]).toContain('organisation_id=eq.apgi-org');
 });
 it('never exposes client-specific courses even when an offering is published',async()=>{respond({hidden:true});expect((await getPublicCatalogue()).courses).toEqual([]);});
 it('never treats drafts or an unreviewed offering as published',async()=>{respond({published:false});expect((await getPublicCatalogue()).courses).toEqual([]);respond({release:false});expect((await getPublicCatalogue()).courses).toEqual([]);});
 it('fails closed on database failure instead of showing stale courses',async()=>{rest.mockResolvedValue(new Response('',{status:503}));await expect(getPublicCatalogue()).rejects.toThrow();});
 it('reflects publication and withdrawal on the next read without editing the website',async()=>{respond({published:false});expect((await getPublicCatalogue()).courses).toHaveLength(0);respond();expect((await getPublicCatalogue()).courses).toHaveLength(1);respond({published:false});expect((await getPublicCatalogue()).courses).toHaveLength(0);});
});

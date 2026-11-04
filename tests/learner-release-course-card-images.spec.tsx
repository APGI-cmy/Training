import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({principal:vi.fn(),rpc:vi.fn(),rest:vi.fn(),revalidate:vi.fn()}));
vi.mock('@/server/services/platform-principals',()=>({requirePlatformPrincipal:m.principal}));
vi.mock('@/server/services/messages',()=>({messageRpc:m.rpc}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
vi.mock('@/server/auth/session',()=>({getSupabaseRestUrl:(p:string)=>'https://example.supabase.co'+p}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
import {saveCourseCardImage} from '@/server/actions/course-card-images';
import {courseCardImageWorkspace,getSavedCourseCardImages} from '@/server/services/course-card-images';
import {CourseCardCover} from '@/components/course/CourseCardCover';
function form(image='library:welcome-photo-01'){const f=new FormData();f.set('course','vpshr-level-0');f.set('image',image);f.set('alt','Course artwork');return f;}
beforeEach(()=>{vi.resetAllMocks();m.principal.mockResolvedValue({session:{user:{id:'verified-actor'}}});m.rpc.mockResolvedValue(undefined);});
describe('Course card artwork',()=>{
 it('requires a verified principal before reading a library or writing a selection',async()=>{m.principal.mockRejectedValue(Error('Not allowed'));expect((await saveCourseCardImage({},form())).error).toBe('Not allowed');await expect(courseCardImageWorkspace()).rejects.toThrow('Not allowed');expect(m.rpc).not.toHaveBeenCalled();});
 it('saves a shared image and refreshes every course-card surface',async()=>{expect((await saveCourseCardImage({},form())).success).toContain('saved');expect(m.rpc).toHaveBeenCalledWith('v3_course_card_image_save',expect.objectContaining({p_actor:'verified-actor',p_course:'vpshr-level-0',p_shared:'library:welcome-photo-01',p_image:null}));expect(m.revalidate.mock.calls.map(c=>c[0])).toEqual(['/admin/courses','/catalogue','/courses','/dashboard','/company/[id]']);});
 it('does not accept arbitrary image URLs or an unknown course',async()=>{expect((await saveCourseCardImage({},form('https://untrusted.example/image.jpg'))).error).toContain('Image library');const f=form();f.set('course','unknown');expect((await saveCourseCardImage({},f)).error).toContain('available course');expect(m.rpc).not.toHaveBeenCalled();});
 it('passes imported identifiers to the database for company, purpose and storage verification',async()=>{await saveCourseCardImage({},form('11111111-1111-4111-8111-111111111111'));expect(m.rpc).toHaveBeenCalledWith('v3_course_card_image_save',expect.objectContaining({p_image:'11111111-1111-4111-8111-111111111111',p_shared:null}));});
 it('reports a failed database save without claiming success or revalidating',async()=>{m.rpc.mockRejectedValue(Error('Save failed'));expect(await saveCourseCardImage({},form())).toEqual({error:'Save failed'});expect(m.revalidate).not.toHaveBeenCalled();});
 it('can restore the original without deleting any library artwork',async()=>{const f=form('');f.set('operation','reset');await saveCourseCardImage({},f);expect(m.rpc).toHaveBeenCalledWith('v3_course_card_image_save',expect.objectContaining({p_reset:true,p_image:null,p_shared:null}));});
 it('renders the saved artwork and retains the original and empty fallback',()=>{expect(renderToStaticMarkup(<CourseCardCover courseSlug="vpshr-level-0" cover={{src:'/images/changed.jpg',alt:'New artwork'}}/>)).toContain('New artwork');expect(renderToStaticMarkup(<CourseCardCover courseSlug="vpshr-level-0"/>)).toContain('vpshr-cover.png');expect(renderToStaticMarkup(<CourseCardCover courseSlug="unknown"/>)).toContain('course-card-cover--fallback');});
 it('resolves only validated stored library references into image URLs',async()=>{m.rest.mockResolvedValue(new Response(JSON.stringify([{course_id:'a',shared_image:'library:welcome-photo-01',image_id:null,alt_text:'Shared',image:null},{course_id:'b',shared_image:null,image_id:'image-id',alt_text:'Imported',image:{object_path:'company/file.jpg'}}])));const images=await getSavedCourseCardImages();expect(images.a.src).toBe('/images/email-library/welcome-photo-01.jpg');expect(images.b.src).toBe('https://example.supabase.co/storage/v1/object/public/email-message-images/company/file.jpg');});
});

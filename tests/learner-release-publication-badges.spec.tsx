import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,beforeEach} from 'vitest';
const rest=vi.hoisted(()=>vi.fn());
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:rest}));
import {getPublishedCourseIds} from '@/server/services/course-publication-status';
import {CoursePublicationBadge} from '@/components/course/CoursePublicationBadge';

describe('Course publication labels',()=>{
 beforeEach(()=>rest.mockReset());
 it('labels a published release explicitly and separately from enrolment',()=>{const html=renderToStaticMarkup(<CoursePublicationBadge published/>);expect(html).toContain('Publication status: Published');expect(html).toMatch(/class="[^"]*published/);expect(html).toContain('company allocation and enrolment');});
 it('labels an unpublished course as under review in its own status class',()=>{const html=renderToStaticMarkup(<CoursePublicationBadge published={false}/>);expect(html).toContain('Publication status: Under review');expect(html).toMatch(/class="[^"]*review/);});
 it('does not present an unavailable lookup as approval',()=>{expect(renderToStaticMarkup(<CoursePublicationBadge published={null}/>)).toContain('Publication status unavailable');expect(renderToStaticMarkup(<CoursePublicationBadge published={null} underReview/>)).toContain('Under review');});
 it('uses only published offerings linked to reviewed releases, without granting access',async()=>{rest.mockResolvedValue(Response.json([{course_id:'vpshr-level-0',status:'published',reviewed_release_id:'release'},{course_id:'scannex-training-programme',status:'draft',reviewed_release_id:'release'},{course_id:'tiger-kidnapping-telecommunications',status:'published',reviewed_release_id:null},{course_id:'other',status:'published',reviewed_release_id:'release'}]));expect([...await getPublishedCourseIds(['vpshr-level-0','scannex-training-programme','tiger-kidnapping-telecommunications'])??[]]).toEqual(['vpshr-level-0']);expect(rest.mock.calls[0][0]).toContain('status=eq.published&or=(reviewed_release_id.not.is.null,shared_distribution_id.not.is.null)');expect(rest.mock.calls[0]).toHaveLength(1);});
 it('returns unknown on a service failure and avoids a lookup for an empty catalogue',async()=>{rest.mockResolvedValue(new Response('',{status:503}));expect(await getPublishedCourseIds(['course'])).toBeNull();rest.mockClear();expect(await getPublishedCourseIds([])).toEqual(new Set());expect(rest).not.toHaveBeenCalled();});
});

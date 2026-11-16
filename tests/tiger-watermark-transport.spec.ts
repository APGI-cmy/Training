import {describe,it,expect,vi,beforeEach} from 'vitest';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const m=vi.hoisted(()=>({fetch:vi.fn()}));
vi.mock('@/server/security/provider-fetch',()=>({providerFetch:m.fetch}));
vi.mock('@/server/auth/session',()=>({getSupabaseRestUrl:(p:string)=>`https://eaaqgtdpvbxdgjxphjie.supabase.co${p}`}));
import {adminRest} from '@/server/supabase/admin-rest';
import {watermarkSettings} from '@/server/services/watermark-images';
import {blankWatermark} from '@/lib/watermarks';
beforeEach(()=>{vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-only-not-a-real-secret');m.fetch.mockReset();m.fetch.mockResolvedValue(new Response('{}',{status:200}));});
describe('Real watermark service through the shared HTTP adapter',()=>{
 it('sends validated PNG bytes as image/png instead of relabelling them JSON',async()=>{const f=new FormData();f.set('mark_kind','image');f.set('mark_opacity','7');f.set('mark_image',new File([await readFile(path.resolve('..','nks-certificate-logo.png'))],'watermark.png',{type:'image/png'}));const result=await watermarkSettings(f,'mark','11111111-1111-4111-8111-111111111111',blankWatermark(),true);const [url,init]=m.fetch.mock.calls[0];expect(url).toContain('/storage/v1/object/alp-branding-assets/organisations/');expect(init.headers.get('content-type')).toBe('image/png');expect(init.headers.get('authorization')).toBe('Bearer test-only-not-a-real-secret');expect(Array.from(init.body.slice(0,8))).toEqual([137,80,78,71,13,10,26,10]);expect(init.redirect).toBe('error');expect(result.kind).toBe('image');});
 it('keeps JSON as the default for existing database requests',async()=>{await adminRest('/rest/v1/organisations',{method:'POST',body:'{}'});expect(m.fetch.mock.calls[0][1].headers.get('content-type')).toBe('application/json');});
});

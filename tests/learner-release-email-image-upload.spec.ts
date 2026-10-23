import {afterEach,describe,expect,it,vi} from 'vitest';
import sharp from 'sharp';
vi.mock('@/server/auth/session',()=>({getSupabaseRestUrl:(path:string)=>`https://example.invalid${path}`}));
import {uploadEmailImage} from '@/server/services/email-image-upload';
const company='11111111-1111-4111-8111-111111111111';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('Email graphic import',()=>{
 it('rejects an SVG disguised as a PNG without uploading',async()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await expect(uploadEmailImage(company,new File(['<svg onload="bad()"/>'],'graphic.png',{type:'image/png'}))).rejects.toThrow('PNG, JPEG or WebP');expect(fetch).not.toHaveBeenCalled();});
 it('rejects missing, oversized and corrupt images',async()=>{await expect(uploadEmailImage(company,null)).rejects.toThrow('Choose');await expect(uploadEmailImage(company,new File([new Uint8Array(2097153)],'large.jpg'))).rejects.toThrow('2 MB');await expect(uploadEmailImage(company,new File([new Uint8Array([255,216,255,0])],'bad.jpg'))).rejects.toThrow('could not be opened');});
 it('decodes and re-encodes a real image and stores it in the verified company path',async()=>{vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture');const fetch=vi.fn().mockResolvedValue(new Response('{}',{status:200}));vi.stubGlobal('fetch',fetch);const original=await sharp({create:{width:30,height:20,channels:3,background:'#123456'}}).png().toBuffer();const result=await uploadEmailImage(company,new File([new Uint8Array(original)],'my graphic.png',{type:'image/png'}));expect(result.url).toMatch(new RegExp(`/public/email-message-images/${company}/[a-f0-9-]+.jpg$`));expect(result.path).toMatch(new RegExp(`^${company}/`));expect(fetch.mock.calls[0][1].headers['content-type']).toBe('image/jpeg');expect(Buffer.from(fetch.mock.calls[0][1].body).subarray(0,3)).toEqual(Buffer.from([255,216,255]));});
});

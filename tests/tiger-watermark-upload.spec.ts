import {describe,it,expect,vi,beforeEach} from 'vitest';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {randomBytes} from 'node:crypto';
const m=vi.hoisted(()=>({rest:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
import {watermarkSettings} from '@/server/services/watermark-images';
import {blankWatermark} from '@/lib/watermarks';
const company='11111111-1111-4111-8111-111111111111';
const fixture=`organisations/${company}/watermarks/22222222-2222-4222-8222-222222222222.png`;
function form(){const f=new FormData();f.set('mark_kind','image');f.set('mark_opacity','7');return f;}
beforeEach(()=>{m.rest.mockReset();m.rest.mockResolvedValue(new Response('',{status:200}));});
describe('Independent, controlled watermark image uploads',()=>{
 it('fits a compressed photograph into the existing storage limit after PNG normalisation',async()=>{const jpg=await sharp(randomBytes(1000*1000*3),{raw:{width:1000,height:1000,channels:3}}).jpeg({quality:80}).toBuffer();expect(jpg.length).toBeLessThan(2*1024*1024);const f=form();f.set('mark_image',new File([new Uint8Array(jpg)],'photo.jpg',{type:'image/jpeg'}));await watermarkSettings(f,'mark',company,blankWatermark(),true);expect(m.rest.mock.calls[0][1].body.byteLength).toBeLessThanOrEqual(2*1024*1024);});
 it('normalises a real image and saves it at a new company-scoped path',async()=>{const f=form();f.set('mark_image',new File([await readFile(path.resolve('..','nks-certificate-logo.png'))],'watermark.png',{type:'image/png'}));const result=await watermarkSettings(f,'mark',company,blankWatermark(),true);expect(result.kind).toBe('image');expect(result.imagePath).toMatch(new RegExp(`^organisations/${company}/watermarks/[0-9a-f-]+\\.png$`));expect(m.rest.mock.calls[0][0]).toContain('/storage/v1/object/alp-branding-assets/organisations/');expect(m.rest.mock.calls[0][1].headers['content-type']).toBe('image/png');});
 it('keeps an existing saved image when the file input is left empty',async()=>{expect((await watermarkSettings(form(),'mark',company,{...blankWatermark(),imagePath:fixture},true)).imagePath).toBe(fixture);expect(m.rest).not.toHaveBeenCalled();});
 it('rejects missing, foreign-company and spoofed images without writing',async()=>{await expect(watermarkSettings(form(),'mark',company,blankWatermark(),true)).rejects.toThrow('Upload');await expect(watermarkSettings(form(),'mark',company,{...blankWatermark(),imagePath:fixture.replace(company,'33333333-3333-4333-8333-333333333333')},true)).rejects.toThrow('Upload');const f=form();f.set('mark_image',new File(['<svg/>'],'fake.png',{type:'image/png'}));await expect(watermarkSettings(f,'mark',company,blankWatermark(),true)).rejects.toThrow();expect(m.rest).not.toHaveBeenCalled();});
 it('does not claim a failed upload was saved',async()=>{m.rest.mockResolvedValue(new Response('',{status:503}));const f=form();f.set('mark_image',new File([await readFile(path.resolve('..','nks-certificate-logo.png'))],'watermark.png',{type:'image/png'}));await expect(watermarkSettings(f,'mark',company,blankWatermark(),true)).rejects.toThrow('could not be uploaded');});
});

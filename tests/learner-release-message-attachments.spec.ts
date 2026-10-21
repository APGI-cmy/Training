import {describe,it,expect,vi} from 'vitest';
vi.mock('@/server/auth/session',()=>({getSupabaseRestUrl:vi.fn()}));
vi.mock('@/server/services/notifications',()=>({notificationSession:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:vi.fn()}));
import {messageAttachment} from '@/server/services/messages';
describe('Private message attachment validation',()=>{
 it('accepts a real PDF signature and strips unsafe filename characters',async()=>{const f=new File(['%PDF-1.7\n'], 'test".pdf',{type:'application/pdf'});expect(await messageAttachment(f)).toMatchObject({name:'test_.pdf',mime:'application/pdf'});});
 it('rejects executable or HTML uploads disguised as PDFs',async()=>{await expect(messageAttachment(new File(['<script>bad()</script>'],'fake.pdf',{type:'application/pdf'}))).rejects.toThrow('Attach a PDF');});
 it('rejects files above the limit before reading their contents',async()=>{await expect(messageAttachment(new File([new Uint8Array(2097153)],'large.png'))).rejects.toThrow('2 MB');});
 it('accepts plain text without executing it',async()=>{expect(await messageAttachment(new File(['Notes for the administrator'],'notes.txt'))).toMatchObject({mime:'text/plain'});});
 it('does not treat a submitted string as a stored attachment',async()=>{expect(await messageAttachment('forged-file-path')).toBeNull();});
});

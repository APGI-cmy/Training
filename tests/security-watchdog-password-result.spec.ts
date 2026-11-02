import {describe,it,expect} from 'vitest';
import {weakPasswordRejected} from '@/server/security-watchdog/password-result';
describe('provider password rejection evidence',()=>{
 it('recognises raw GoTrue responses, not just translated SDK exceptions',()=>{expect(weakPasswordRejected(422,{code:422,error_code:'weak_password',weak_password:{reasons:['pwned']}},'pwned')).toBe(true);expect(weakPasswordRejected(422,{code:'weak_password',weak_password:{reasons:['length']}},'length')).toBe(true);});
 it('requires the specific protection reason being tested',()=>{expect(weakPasswordRejected(422,{error_code:'weak_password',weak_password:{reasons:['length']}},'pwned')).toBe(false);expect(weakPasswordRejected(422,{error_code:'weak_password'},'length')).toBe(false);});
 it('does not treat outages, invalid sessions or successful updates as protection',()=>{for(const [status,body] of [[503,{error_code:'weak_password'}],[401,{error_code:'bad_jwt'}],[200,{error_code:'weak_password'}],[422,{}],[422,null]] as const)expect(weakPasswordRejected(status,body)).toBe(false);});
});

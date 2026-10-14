// Explicit isolated integration QA; never part of production or normal CI.
import { beforeAll, describe, it, expect, vi } from 'vitest';
import nextEnv from '@next/env';
import { createHash, randomBytes } from 'node:crypto';
import { assertStagingIsolation, STAGING_ORIGIN } from '@/server/environment-isolation';
import { adminRest } from '@/server/supabase/admin-rest';
import { registerInvitedUser } from '@/server/actions/auth/register-invited-user';
import { sendPasswordRecoveryEmail } from '@/server/services/email/send-password-recovery';
beforeAll(() => {
  const mode=process.env.NODE_ENV; vi.stubEnv('NODE_ENV','development');
  nextEnv.loadEnvConfig(process.cwd(),true); vi.stubEnv('NODE_ENV',mode); assertStagingIsolation();
});
describe('Version 2 private signup messages', () => {
  it('registers and confirms an invited fictional account without sending email',async () => {
    const users=await (await adminRest('/auth/v1/admin/users?page=1&per_page=100')).json();
    const actor=users.users.find((u:any)=>u.email==='johan.ras@apginc.ca').id;
    const orgs=await (await adminRest('/rest/v1/organisations?slug=eq.apgi&select=id')).json();
    const token=randomBytes(32).toString('base64url'),email=`qa-v2-signup-${Date.now()}@example.invalid`;
    const created=await adminRest('/rest/v1/course_invitations',{method:'POST',body:JSON.stringify({recipient_email:email,course_id:'scannex-training-programme',organisation_id:orgs[0].id,invited_role:'learner',basis:'internal_allocation',reason:'Fictional signup QA',expires_at:new Date(Date.now()+86400000).toISOString(),token_hash:createHash('sha256').update(token).digest('hex'),created_by:actor})});
    expect(created.ok).toBe(true);
    const form=new FormData();form.set('email',email);form.set('token',token);form.set('password',randomBytes(32).toString('base64url'));
    expect(await registerInvitedUser({},form)).toMatchObject({ok:true,message:expect.stringContaining('No email was sent')});
    const rows=await (await adminRest(`/rest/v1/staging_auth_messages?recipient_email=eq.${email}&purpose=eq.confirmation&select=action_url`)).json();
    expect(rows).toHaveLength(1); const url=new URL(rows[0].action_url);
    expect(url.origin).toBe(STAGING_ORIGIN);
    const verify=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/verify',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,'content-type':'application/json'},body:JSON.stringify({token_hash:url.searchParams.get('token_hash'),type:'email'})});
    expect(verify.ok).toBe(true);const verified=await verify.json();expect(verified.user.email_confirmed_at).toBeTruthy();expect(verified.user.email).toBe(email);
    const recovery=await adminRest('/auth/v1/admin/generate_link',{method:'POST',body:JSON.stringify({type:'recovery',email})});const generated=await recovery.json();
    expect(await sendPasswordRecoveryEmail(email,generated.hashed_token,'https://external.example.invalid')).toBe(true);
    const resetRows=await (await adminRest(`/rest/v1/staging_auth_messages?recipient_email=eq.${email}&purpose=eq.recovery&select=action_url`)).json();
    expect(resetRows).toHaveLength(1);const reset=new URL(resetRows[0].action_url);expect(reset.origin).toBe(STAGING_ORIGIN);expect(reset.searchParams.get('next')).not.toContain('external');
    const publicHeaders={apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!};
    const authHeaders={...publicHeaders,authorization:`Bearer ${verified.access_token}`};
    for(const headers of [publicHeaders,authHeaders]) {
      const result=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/staging_auth_messages?select=id',{headers});expect(result.ok).toBe(false);
      for(const fn of ['v2_redeem_admin_invitation','v2_certificate_eligible','v2_next_certificate_number']){
        const r=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(fn==='v2_redeem_admin_invitation'?{p_invitation:randomBytes(16).toString('hex'),p_user:verified.user.id}:fn==='v2_certificate_eligible'?{p_user:verified.user.id,p_course:'scannex-training-programme'}:{})});expect(r.ok).toBe(false);
      }
    }
  });
});

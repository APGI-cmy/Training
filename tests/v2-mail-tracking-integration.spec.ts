// Opt-in V2 integration; sends only to Resend's official simulation inboxes.
import {beforeAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import nextEnv from '@next/env';
import {assertStagingIsolation} from '@/server/environment-isolation';
import {adminRest} from '@/server/supabase/admin-rest';
import {deliverTransactionalEmail} from '@/server/services/email/transactional-delivery';
const results:object[]=[];
beforeAll(()=>{if(process.env.RUN_V2_MAIL_INTEGRATION!=='yes')throw Error('Explicit V2 mail integration opt-in required');nextEnv.loadEnvConfig(process.cwd(),true);assertStagingIsolation();});
describe('Real V2 mail delivery event connection',()=>{
 it.each(['delivered','bounced'])('records a signed %s simulation event',async kind=>{
  const fixture=randomUUID(),key=`qa-mail-${fixture}`,to=`${kind}+${fixture}@resend.dev`;
  const input={to,subject:`QA delivery tracking simulation ${fixture}`,html:'<p>Automated V2 delivery tracking simulation. No action is required.</p>',text:'Automated V2 delivery tracking simulation. No action is required.',idempotencyKey:key,tracking:{category:'system' as const,sourceId:key}};
  const sent=await deliverTransactionalEmail(input);expect(sent.ok).toBe(true);if(!sent.ok)throw Error('Simulation send not confirmed');
  const repeated=await deliverTransactionalEmail(input);expect(repeated).toEqual(sent);
  const response=await adminRest(`/rest/v1/v2_mail_messages?message_key=eq.${key}&select=id`);const [mail]=await response.json();
  const result={fixture:key,messageId:mail?.id,providerId:sent.providerMessageId,expected:kind,observed:false};results.push(result);
  await mkdir('C:/Users/Johan/Codex-Work/email-management-20261025',{recursive:true});
  await writeFile('C:/Users/Johan/Codex-Work/email-management-20261025/provider-qa.json',JSON.stringify(results,null,2));
  for(let elapsed=0;elapsed<30000;elapsed+=2000){
   const events=await adminRest(`/rest/v1/v2_mail_events?provider_id=eq.${sent.providerMessageId}&select=kind`);
   if(events.ok&&(await events.json()).some((e:{kind:string})=>e.kind===kind)){result.observed=true;break;}
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
  await writeFile('C:/Users/Johan/Codex-Work/email-management-20261025/provider-qa.json',JSON.stringify(results,null,2));
  expect(result.observed).toBe(true);
 });
});

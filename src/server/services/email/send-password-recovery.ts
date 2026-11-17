import 'server-only';
import {randomUUID} from 'node:crypto';
import {captureStagingAuthEmail} from './staging-capture';
import {usesStagingMailCapture} from '@/server/environment-isolation';
import {emailConfiguration,deliverTransactionalEmail} from './transactional-delivery';
import {safeRecoveryNext} from '@/lib/auth/safe-recovery-next';
import {recipientBrand} from './recipient-brand';
import {brandedEmail} from './send-course-invitation';
export async function sendPasswordRecoveryEmail(email:string,tokenHash:string,next:string):Promise<boolean>{
 if(usesStagingMailCapture())return captureStagingAuthEmail(email,tokenHash,'recovery',safeRecoveryNext(next));
 const config=emailConfiguration();if(!config)return false;let b;try{b=await recipientBrand(email);}catch{return false;}if(process.env.ALP_ENVIRONMENT==='training-production'&&!b)return false;const brand=b?.name??'APGI Training';
 const url=new URL('/reset-password',b?.origin??config.origin);url.searchParams.set('token_hash',tokenHash);url.searchParams.set('next',safeRecoveryNext(next));
 const instructions='Use the newest reset email. Open the link, select Continue, then choose and confirm your own password within 15 minutes. Your current password remains unchanged until you save the new one. This single-use link expires; if it no longer works, request another from Forgot password. Never send your password to anyone.';
 const r=await deliverTransactionalEmail({to:email,subject:`Reset your ${brand} password`,branding:b?{name:b.name,from:b.from,verified:b.verified}:undefined,html:brandedEmail({brand,logo:b?.logo,color:b?.color,title:'Reset your password',description:`A password reset was requested for your ${brand} training account.`,link:url.toString(),button:'Choose a new password',sections:[{heading:'Before you continue',body:instructions}],footer:'If you did not request a reset, ignore this email.'}),text:`${brand}\nChoose a new password: ${url}\n\n${instructions}\nIf you did not request a reset, ignore this email.`,tracking:{category:'account_recovery',organisationId:b?.organisationId},idempotencyKey:`password-recovery-${randomUUID()}`});return r.ok;
}

import 'server-only';
import {randomUUID} from 'node:crypto';
import {captureStagingAuthEmail} from './staging-capture';
import {usesStagingMailCapture} from '@/server/environment-isolation';
import {emailConfiguration,deliverTransactionalEmail} from './transactional-delivery';
import {recipientBrand} from './recipient-brand';
import {brandedEmail} from './send-course-invitation';
export async function sendAccountConfirmationEmail(email:string,tokenHash:string,organisationId?:string):Promise<boolean>{
 if(usesStagingMailCapture())return captureStagingAuthEmail(email,tokenHash,'confirmation');
 const config=emailConfiguration();if(!config)return false;let b;try{b=await recipientBrand(email,organisationId);}catch{return false;}if(process.env.ALP_ENVIRONMENT==='training-production'&&!b)return false;const brand=b?.name??'APGI Training';
 const url=new URL('/confirm-account',b?.origin??config.origin);url.searchParams.set('token_hash',tokenHash);
 const instructions='Confirm your email, then complete and save your profile. Your invited role or enrolled course will be activated automatically. This link expires and can only be used once.';
 const r=await deliverTransactionalEmail({to:email,subject:`Confirm your ${brand} account`,branding:b?{name:b.name,from:b.from,verified:b.verified}:undefined,html:brandedEmail({brand,logo:b?.logo,color:b?.color,title:'Confirm your training account',description:`Welcome to ${brand}.`,link:url.toString(),button:'Confirm email and complete profile',footer:instructions+' If you did not create this account, ignore this email.'}),text:`Welcome to ${brand}. Confirm your email: ${url}\n\n${instructions}`,tracking:{category:'account_confirmation',organisationId:b?.organisationId},idempotencyKey:`account-confirmation-${randomUUID()}`});return r.ok;
}

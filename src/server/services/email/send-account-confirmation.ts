import "server-only";
import { randomUUID } from "node:crypto";
import { captureStagingAuthEmail } from "./staging-capture";
import { usesStagingMailCapture } from "@/server/environment-isolation";
import { emailConfiguration, deliverTransactionalEmail } from "./transactional-delivery";

export async function sendAccountConfirmationEmail(email:string,tokenHash:string):Promise<boolean>{
  if(usesStagingMailCapture())return captureStagingAuthEmail(email,tokenHash,'confirmation');
  const config=emailConfiguration();if(!config)return false;
  const url=new URL('/confirm-account',config.origin);url.searchParams.set('token_hash',tokenHash);
  const link=url.toString(),htmlLink=link.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  const instructions='Confirm your email, then complete and save your profile. Your invited role or enrolled course will be activated automatically.';
  const r=await deliverTransactionalEmail({to:email,subject:'Confirm your APGI Training account',html:`<p>Welcome to APGI Training.</p><p><a href="${htmlLink}">Confirm your email and complete your profile</a></p><p>${instructions}</p><p>This link expires and can only be used once. If you did not create this account, ignore this email.</p>`,text:`Welcome to APGI Training. Confirm your email: ${link}\n\n${instructions} This link expires and can only be used once.`,tracking:{category:'account_confirmation'},idempotencyKey:`account-confirmation-${randomUUID()}`});return r.ok;
}

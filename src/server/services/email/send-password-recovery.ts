import "server-only";
import { randomUUID } from "node:crypto";
import { captureStagingAuthEmail } from "./staging-capture";
import { usesStagingMailCapture } from "@/server/environment-isolation";
import { emailConfiguration, deliverTransactionalEmail } from "./transactional-delivery";
import { safeRecoveryNext } from "@/lib/auth/safe-recovery-next";

export async function sendPasswordRecoveryEmail(email:string,tokenHash:string,next:string):Promise<boolean>{
  if(usesStagingMailCapture())return captureStagingAuthEmail(email,tokenHash,'recovery',safeRecoveryNext(next));
  const config=emailConfiguration();if(!config)return false;
  const url=new URL('/reset-password',config.origin);url.searchParams.set('token_hash',tokenHash);url.searchParams.set('next',safeRecoveryNext(next));
  const link=url.toString(),htmlLink=link.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  const instructions='Use the newest reset email. Open the link, select Continue, then choose and confirm your own password within 15 minutes. Your current password remains unchanged until you save the new one. This single-use link expires; if it no longer works, request another from Forgot password on the Version 2 sign-in page. Never send your password to anyone.';
  const r=await deliverTransactionalEmail({to:email,subject:'Reset your APGI Training password',html:`<p>A password reset was requested for your APGI Training account.</p><p><a href="${htmlLink}">Choose a new password</a></p><p>${instructions}</p><p>If you did not request a reset, ignore this email.</p>`,text:`Choose a new APGI Training password: ${link}\n\n${instructions}\n\nIf you did not request a reset, ignore this email.`,tracking:{category:'account_recovery'},idempotencyKey:`password-recovery-${randomUUID()}`});return r.ok;
}

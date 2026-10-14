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
  const r=await deliverTransactionalEmail({to:email,subject:'Reset your APGI Training password',html:`<p>A password reset was requested for your APGI Training account.</p><p><a href="${htmlLink}">Choose a new password</a></p><p>This link expires and can only be used once. If you did not request a reset, ignore this email. Your password will stay unchanged.</p>`,text:`Choose a new APGI Training password: ${link}\n\nThis link expires and can only be used once. If you did not request a reset, ignore this email. Your password will stay unchanged.`,idempotencyKey:`password-recovery-${randomUUID()}`});return r.ok;
}

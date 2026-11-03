import 'server-only';
import {createMessage,readKey,encrypt,enums} from 'openpgp';
import {verifiedSessionClaims} from '@/server/auth/session-assurance';
import type {AlpSession} from '@/server/auth/session';
import {assertStagingIsolation,STAGING_PROJECT_ID} from '@/server/environment-isolation';
import {WatchdogError} from './access';
import {recoveryPublicKey} from './recovery-recipient';

export const recoveryFingerprint='3D90ACEB24A3B6BE23B7A3FE0C28764CE3B04BFE';
export const recoverySecretNames=['SECURITY_WATCHDOG_SIGNING_KEY','STAGING_RESEND_WEBHOOK_SECRET','ALP_STRIPE_SETUP_KEY','CRON_SECRET','STAGING_RESEND_API_KEY','CERTIFICATE_SIGNING_SECRET','SUPABASE_SERVICE_ROLE_KEY'] as const;
const configNames=['STAGING_EMAIL_FROM','STAGING_EMAIL_SCOPE','PRIVATE_FILE_BUCKET','SCANNEX_VIEWER_LAB_ENABLED','ALP_PAYMENTS_MODE','ALP_EMAIL_MODE','NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','NEXT_PUBLIC_SUPABASE_URL','ALP_STAGING_DATABASE_REF','ALP_ENVIRONMENT'] as const;

// Call only after the provider has verified this session and its current access.
export function requireRecoveryMfa(session:AlpSession,now=Date.now()){
 if(!session.security?.enrolled||session.security.requiresMfa||verifiedSessionClaims(session.accessToken,session.user.id)?.aal!=='aal2')throw new WatchdogError('Verify your authenticator before exporting recovery credentials.');
 let value;try{value=JSON.parse(Buffer.from(session.accessToken.split('.')[1],'base64url').toString());}catch{throw new WatchdogError('Verify your authenticator again before exporting recovery credentials.');}
 const times=Array.isArray(value.amr)?value.amr.filter((a:{method?:unknown;timestamp?:unknown})=>a?.method==='totp'&&typeof a.timestamp==='number').map((a:{timestamp:number})=>a.timestamp*1000):[];
 const recent=Math.max(0,...times.filter((t:number)=>t<=now+30000));
 if(now-recent>15*60000)throw new WatchdogError('Verify your authenticator again, then return here within fifteen minutes to download the recovery package.');
}

export async function encryptedServiceRecovery(env:NodeJS.ProcessEnv=process.env,now=new Date()){
 assertStagingIsolation(env);
 if(!env.VERCEL||env.VERCEL_PROJECT_ID!==STAGING_PROJECT_ID)throw new WatchdogError('Live recovery export is available only inside the approved V2 deployment.',503);
 if(recoverySecretNames.some(name=>!env[name]?.trim()))throw new WatchdogError('The complete live recovery configuration is unavailable.',503);
 const key=await readKey({armoredKey:recoveryPublicKey});
 if(key.getFingerprint().toUpperCase()!==recoveryFingerprint||key.isPrivate())throw new WatchdogError('The approved recovery recipient could not be verified.',503);
 const expiry=await key.getExpirationTime();if(expiry instanceof Date&&expiry<=now)throw new WatchdogError('The recovery public key needs renewal before an export can be made.',503);
 const values=Object.fromEntries([...recoverySecretNames,...configNames].filter(name=>env[name]!==undefined).map(name=>[name,env[name]]));
 const payload={version:1,kind:'apgi-v2-live-service-recovery',capturedAt:now.toISOString(),projectId:STAGING_PROJECT_ID,deploymentId:env.VERCEL_DEPLOYMENT_ID??null,recipientFingerprint:recoveryFingerprint,warning:'Live service credentials. Keep this encrypted package private. Restore with outbound email, payments and Viewer integrations disconnected until individually authorised.',values};
 return encrypt({message:await createMessage({text:JSON.stringify(payload)}),encryptionKeys:key,format:'binary',config:{preferredSymmetricAlgorithm:enums.symmetric.aes256}});
}

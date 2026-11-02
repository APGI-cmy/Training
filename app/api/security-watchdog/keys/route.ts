import {watchdogPublicKey} from '@/server/security-watchdog/signing';
export const dynamic='force-dynamic';
export function GET(){try{const {publicKey,keyId}=watchdogPublicKey();return Response.json({algorithm:'Ed25519',keyId,publicKey,encoding:'SPKI DER base64'},{headers:{'cache-control':'no-store'}});}catch{return Response.json({error:'Report verification key is unavailable.'},{status:503});}}

import 'server-only';
import {createPrivateKey,createPublicKey,createHash,sign,verify} from 'node:crypto';
import {canonicalJson,type WatchdogPayload,type WatchdogProof} from '@/lib/security-watchdog';
// Approved public key from the initial live release. Keep old verification keys
// when the private signing key rotates; this list never contains private keys.
const retainedKeys=['MCowBQYDK2VwAyEA3LKXpik3eIt/9dYqLpJfOVRenkk5aUsirLKGyUESzEU='];
function signingKey(){
 const value=process.env.SECURITY_WATCHDOG_SIGNING_KEY;
 if(!value)throw Error('Watchdog report signing is not configured.');
 return createPrivateKey({key:Buffer.from(value,'base64'),format:'der',type:'pkcs8'});
}
export function watchdogPublicKey(){
 const key=createPublicKey(signingKey()),publicKey=key.export({type:'spki',format:'der'}).toString('base64');
 return {key,publicKey,keyId:createHash('sha256').update(publicKey).digest('hex').slice(0,24)};
}
export function signWatchdogReport(payload:WatchdogPayload):WatchdogProof{
 const bytes=Buffer.from(canonicalJson(payload)),pub=watchdogPublicKey();
 return {algorithm:'Ed25519',digest:createHash('sha256').update(bytes).digest('hex'),keyId:pub.keyId,publicKey:pub.publicKey,signature:sign(null,bytes,signingKey()).toString('base64')};
}
export function verifyWatchdogReport(payload:WatchdogPayload,proof:WatchdogProof){
 try{const approved=watchdogVerificationKeys().find(k=>k.publicKey===proof.publicKey&&k.keyId===proof.keyId),bytes=Buffer.from(canonicalJson(payload));
  return !!approved&&proof.algorithm==='Ed25519'
  &&proof.digest===createHash('sha256').update(bytes).digest('hex')&&verify(null,bytes,createPublicKey({key:Buffer.from(approved.publicKey,'base64'),format:'der',type:'spki'}),Buffer.from(proof.signature,'base64'));
 }catch{return false;}
}
export function watchdogVerificationKeys(){
 const active=watchdogPublicKey(),configured=JSON.parse(process.env.SECURITY_WATCHDOG_VERIFICATION_KEYS??'[]') as unknown;
 if(!Array.isArray(configured)||configured.some(v=>typeof v!=='string'))throw Error('Invalid trusted verification-key configuration.');
 return [...new Set([active.publicKey,...retainedKeys,...configured])].map(publicKey=>({publicKey,keyId:createHash('sha256').update(publicKey).digest('hex').slice(0,24)}));
}

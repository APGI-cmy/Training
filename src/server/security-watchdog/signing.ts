import 'server-only';
import {createPrivateKey,createPublicKey,createHash,sign,verify} from 'node:crypto';
import {canonicalJson,type WatchdogPayload,type WatchdogProof} from '@/lib/security-watchdog';
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
 try{const pub=watchdogPublicKey(),bytes=Buffer.from(canonicalJson(payload));
  return proof.algorithm==='Ed25519'&&proof.publicKey===pub.publicKey&&proof.keyId===pub.keyId
  &&proof.digest===createHash('sha256').update(bytes).digest('hex')&&verify(null,bytes,pub.key,Buffer.from(proof.signature,'base64'));
 }catch{return false;}
}

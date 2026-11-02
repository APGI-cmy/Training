import 'server-only';
import {createHmac} from 'node:crypto';
// Only disposable Watchdog fixtures use this helper. Real owners use their own app.
export function syntheticTotp(secret:string,now=Date.now()){
 if(!/^[A-Z2-7]+=*$/i.test(secret))throw Error('Invalid synthetic authenticator secret');
 let bits='';for(const c of secret.replace(/=+$/,''))bits+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c.toUpperCase()).toString(2).padStart(5,'0');
 const key=Buffer.from((bits.match(/.{8}/g)??[]).map(s=>parseInt(s,2))),clock=Buffer.alloc(8);
 clock.writeBigUInt64BE(BigInt(Math.floor(now/30000)));
 const digest=createHmac('sha1',key).update(clock).digest();
 return String((digest.readUInt32BE(digest[19]&15)&0x7fffffff)%1000000).padStart(6,'0');
}

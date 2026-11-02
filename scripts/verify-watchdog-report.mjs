// Use a separately obtained trusted public-key file, not the report's own key.
import {readFile} from 'node:fs/promises';
import {createPublicKey,createHash,verify} from 'node:crypto';
import {canonicalJson} from '../src/lib/security-watchdog.ts';
const [reportPath,trustedKeyPath]=process.argv.slice(2);
if(!reportPath||!trustedKeyPath)throw Error('Usage: node scripts/verify-watchdog-report.mjs report.json trusted-public-key.json');
const report=JSON.parse(await readFile(reportPath,'utf8'));
const trusted=JSON.parse(await readFile(trustedKeyPath,'utf8'));
const keyId=createHash('sha256').update(trusted.publicKey).digest('hex').slice(0,24);
const bytes=Buffer.from(canonicalJson(report.payload));
const proof=report.proof;
if(proof.algorithm!=='Ed25519'||proof.publicKey!==trusted.publicKey||proof.keyId!==keyId
 ||proof.digest!==createHash('sha256').update(bytes).digest('hex')
 ||!verify(null,bytes,createPublicKey({key:Buffer.from(trusted.publicKey,'base64'),format:'der',type:'spki'}),Buffer.from(proof.signature,'base64')))
 throw Error('Report integrity verification failed.');
console.log(JSON.stringify({signatureVerified:true,run:report.payload.runId,scope:report.payload.scope.label,cleanup:report.payload.cleanup,checks:report.payload.checks.length}));

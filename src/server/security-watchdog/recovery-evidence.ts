import 'server-only';
import type {WatchdogCheck} from '@/lib/security-watchdog';
// Dated, executed recovery-drill evidence, reviewed with the release. This is
// deliberately separate from editable administrator evidence/action statements.
// No provider credential, customer row, filename or authenticator is included.
export const recoveryDrillEvidence={
 id:'recovery-20261103',backupAt:'2026-11-02T07:46:53Z',startedAt:'2026-11-03T06:31:41Z',verifiedAt:'2026-11-03T07:00:32.090Z',reviewBy:'2026-12-03T07:00:32.090Z',
 source:'eaaqgtdpvbxdgjxphjie',target:'guoarsqxmjeqheqsnczg',tables:135,files:16,privateFiles:10,boundaryChecks:21,applicationChecks:43,applicationVerifiedAt:'2026-11-03T09:15:03.682Z',applicationReceipt:'ed645f84180b8312f886039a1650c29dfb624aa9ed0172bb8d11b656e83ff891',
 receipts:{storage:'13bfdc11e3ac6172d231f6889d918fc02249f5badf92cee350305a6fce1ebee0',access:'d01606afab23725d74e299a112437535d828054907586c6110e01a8645fede60',comparison:'cfc12482db21c999f7a786b68cfa6cc9e61bdd797e922e8a33c85f9bef1689c8'},
 limitations:[
  'This is dated evidence of the executed database and file recovery drill. The daily Watchdog run does not repeat a full restore.',
  'The database recovery point is 2 November at 07:46:53 UTC. Later account, operational and security-history changes are outside that backup; they were not silently treated as recovered.',
  'Fourteen reviewed security updates were rolled forward on the separate copy. Its schema, access policies, constraints, indexes, triggers, grants, functions and extensions matched the current source. Review, commercial, learner and certificate records retained their saved data hashes.',
  'Storage file bytes came from a separate encrypted snapshot captured on 3 November. All 16 files were restored from that archive and hash-verified; all 10 private files blocked anonymous reads.',
  'All 21 restored Auth/MFA, session, company-separation and protected-record checks passed. Temporary identities were removed. No application, email sender, payments, AI or Viewer integration was repointed to recovery.',
  'A second isolated application exercise recovered the encrypted 3 November database and all 16 file objects on a loopback-only provider. All 43 application, MFA, course-file, private attachment, company payment-report, Storage and session checks passed; fictional accounts were cleaned. Exact hosted column/schema grants and native TOTP configuration were restored. Hosted edge transport and real integration secrets were not reproduced.',
  'The owner confirmed saving and reopening the separate recovery package in SecurePass. A fresh authenticated OneDrive download was decrypted into a new external directory; the detailed cloud recovery evidence below records that later exercise. A new-machine recovery directly from the password-manager note has not been exercised.',
  'Full hosted application cutover, approved recovery-time/data-loss objectives, immutable archive retention, provider-managed identity keys and independent human acceptance remain separate work.',
 ],
} as const;
export const cloudRecoveryEvidence={
 verifiedAt:'2026-11-03T12:30:08.262Z',databaseAt:'2026-11-03T08:14:12.672624Z',storageAt:'2026-11-03T06:51:24.557Z',reviewBy:'2026-12-03T12:30:08.262Z',
 files:18908,tables:135,rows:2416,storageFiles:16,applicationChecks:43,exactTables:134,
 applicationReceipt:'45f9fa09adeeddafc20ab8abb6c3e46e773b23ee78a76871da2bad0f6943e0d8',sourceReceipt:'c1ff3eefb053ff8f924f54c53e30ecead1eedf88dd78986fa212eaa32450f27b',rowReceipt:'4f457ba7ca0813f6a445533605c5b20870b005557caa3a50ca5b279872d9dd52',
 limitations:[
  'The encrypted files were downloaded through authenticated OneDrive, rather than recovered only from the local synced folder. Both compressed-source and ciphertext hashes matched. The 180-file encrypted source patch also matched its receipt.',
  'All 135 tables and 16 file objects were restored into a loopback-only native provider. The 134 unchanged tables matched the backup row hashes exactly; the automatic-monitor table deliberately differs because scheduled jobs are disabled in recovery.',
  'All 43 application checks passed, including fictional-account MFA, company separation, private attachments, recovered course files, company payment reports, Storage and session revocation. Test identities were removed.',
  'The recovered application used the downloaded source and local-only provider adapters. All 102 required production dependency versions matched the recovered lockfile. Email, payments and Viewer integrations stayed disconnected.',
  'Database and file snapshots have different capture times. Records changed after either snapshot are outside that recovery point. This is an isolated restore, not a hosted production cutover or a test of real users’ passwords and authenticators.',
  'The owner confirmed separate SecurePass escrow. Recovery on a different machine directly from that vault, provider-managed identity keys, approved recovery objectives and independent human acceptance remain unverified.',
 ],
} as const;
export function recoveryDrillCheck(scope:string|null,now=Date.now()):WatchdogCheck{
 const e=recoveryDrillEvidence,current=now>=Date.parse(e.verifiedAt)&&now<=Date.parse(e.reviewBy);
 const cloud=cloudRecoveryEvidence;
 if(now>=Date.parse(cloud.verifiedAt)&&now<=Date.parse(cloud.reviewBy))return {id:'restore',title:'Dated database and file recovery drill',kind:'manual',state:'passed',detail:`Authenticated OneDrive download recovery verified ${cloud.verifiedAt}. ${scope===null?`${cloud.files} source/course files; ${cloud.tables} restored tables; ${cloud.storageFiles} file objects; ${cloud.applicationChecks}/${cloud.applicationChecks} isolated application checks passed. Application receipt ${cloud.applicationReceipt}. `:'The shared database/file recovery and fictional company boundaries were verified. '}This daily run references that dated exercise; it does not perform another full restore. Database snapshot ${cloud.databaseAt}; file snapshot ${cloud.storageAt}. Automatic jobs stayed disabled in recovery. Application cutover, fresh password-manager retrieval on another machine, provider-managed identity keys and independent human acceptance remain separate. Review by ${cloud.reviewBy}.`,action:'Open the dated recovery evidence for its scope and remaining continuity actions.'};
 return {id:'restore',title:'Dated database and file recovery drill',kind:'manual',state:current?'passed':'not_tested',
  detail:current?`Executed recovery drill ${e.id}, verified ${e.verifiedAt}. ${scope===null?`${e.tables} tables checked after security roll-forward; ${e.files} encrypted-backup files restored and hash-verified; ${e.boundaryChecks} restored access checks passed; ${e.applicationChecks} further isolated application checks passed at ${e.applicationVerifiedAt}. `:'The shared database/file recovery procedure and synthetic company boundaries were verified. '}This daily run references that dated exercise; it does not perform another full restore. Database backup: ${e.backupAt}; file snapshot: 3 November. Application cutover, completed key escrow, cloud-download recovery and independent acceptance remain separate. Additional application exercise receipt: ${scope===null?e.applicationReceipt:'available to platform principals'}. Evidence digests: Storage ${e.receipts.storage}; access ${e.receipts.access}; comparison ${e.receipts.comparison}. Review by ${e.reviewBy}.`:'No current dated recovery-drill evidence is available in this release. The last exercise must be repeated/reviewed; it is not counted as a pass.',
  action:current?'Review the drill scope and remaining continuity actions under Remaining work.':'Repeat the approved separate-environment recovery drill and retain fresh verified receipts.'};
}

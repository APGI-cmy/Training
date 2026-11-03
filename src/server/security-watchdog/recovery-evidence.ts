import 'server-only';
import type {WatchdogCheck} from '@/lib/security-watchdog';
// Dated, executed recovery-drill evidence, reviewed with the release. This is
// deliberately separate from editable administrator evidence/action statements.
// No provider credential, customer row, filename or authenticator is included.
export const recoveryDrillEvidence={
 id:'recovery-20261103',backupAt:'2026-11-02T07:46:53Z',startedAt:'2026-11-03T06:31:41Z',verifiedAt:'2026-11-03T07:00:32.090Z',reviewBy:'2026-12-03T07:00:32.090Z',
 source:'eaaqgtdpvbxdgjxphjie',target:'guoarsqxmjeqheqsnczg',tables:135,files:16,privateFiles:10,boundaryChecks:21,
 receipts:{storage:'13bfdc11e3ac6172d231f6889d918fc02249f5badf92cee350305a6fce1ebee0',access:'d01606afab23725d74e299a112437535d828054907586c6110e01a8645fede60',comparison:'cfc12482db21c999f7a786b68cfa6cc9e61bdd797e922e8a33c85f9bef1689c8'},
 limitations:[
  'This is dated evidence of the executed database and file recovery drill. The daily Watchdog run does not repeat a full restore.',
  'The database recovery point is 2 November at 07:46:53 UTC. Later account, operational and security-history changes are outside that backup; they were not silently treated as recovered.',
  'Fourteen reviewed security updates were rolled forward on the separate copy. Its schema, access policies, constraints, indexes, triggers, grants, functions and extensions matched the current source. Review, commercial, learner and certificate records retained their saved data hashes.',
  'Storage file bytes came from a separate encrypted snapshot captured on 3 November. All 16 files were restored from that archive and hash-verified; all 10 private files blocked anonymous reads.',
  'All 21 restored Auth/MFA, session, company-separation and protected-record checks passed. Temporary identities were removed. No application, email sender, payments, AI or Viewer integration was repointed to recovery.',
  'Full application cutover, approved recovery-time/data-loss objectives, off-site archive retention, off-machine encryption-key escrow and independent human acceptance remain separate work.',
 ],
} as const;
export function recoveryDrillCheck(scope:string|null,now=Date.now()):WatchdogCheck{
 const e=recoveryDrillEvidence,current=now>=Date.parse(e.verifiedAt)&&now<=Date.parse(e.reviewBy);
 return {id:'restore',title:'Dated database and file recovery drill',kind:'manual',state:current?'passed':'not_tested',
  detail:current?`Executed recovery drill ${e.id}, verified ${e.verifiedAt}. ${scope===null?`${e.tables} tables checked after security roll-forward; ${e.files} encrypted-backup files restored and hash-verified; ${e.boundaryChecks} restored access checks passed. `:'The shared database/file recovery procedure and synthetic company boundaries were verified. '}This daily run references that dated exercise; it does not perform another full restore. Database backup: ${e.backupAt}; file snapshot: 3 November. Application cutover, off-site/key-escrow controls and independent acceptance remain separate. Evidence digests: Storage ${e.receipts.storage}; access ${e.receipts.access}; comparison ${e.receipts.comparison}. Review by ${e.reviewBy}.`:'No current dated recovery-drill evidence is available in this release. The last exercise must be repeated/reviewed; it is not counted as a pass.',
  action:current?'Review the drill scope and remaining continuity actions under Remaining work.':'Repeat the approved separate-environment recovery drill and retain fresh verified receipts.'};
}

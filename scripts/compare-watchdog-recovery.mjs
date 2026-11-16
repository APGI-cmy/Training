import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export function compareRecovery(source,recovery){
 for(const m of [source,recovery]){
  if(m?.version!==1||!Array.isArray(m.tables)||!m.tables.length||!Number.isFinite(Date.parse(m.capturedAt)))throw Error('Invalid recovery inventory');
  const seen=new Set();for(const t of m.tables){const id=t.schema+'.'+t.table;if(!['public','auth','storage'].includes(t.schema)||typeof t.table!=='string'||seen.has(id)||!Number.isSafeInteger(t.rows)||t.rows<0||![t.digest,t.columnsDigest,t.policiesDigest,t.constraintsDigest,t.indexesDigest,t.triggersDigest,t.grantsDigest].every(d=>typeof d==='string'&&/^[a-f0-9]{64}$/.test(d))||typeof t.rls!=='boolean'||typeof t.forceRls!=='boolean')throw Error('Invalid recovery table inventory');seen.add(id);}
 }
 const sourceTables=new Map(source.tables.map(t=>[t.schema+'.'+t.table,t]));
 const recoveryTables=new Map(recovery.tables.map(t=>[t.schema+'.'+t.table,t]));
 const checks=[...new Set([...sourceTables.keys(),...recoveryTables.keys()])].sort().map(id=>{
  const a=sourceTables.get(id),b=recoveryTables.get(id);
  if(!a||!b)return {table:id,state:!b?'missing_from_recovery':'additional_in_recovery',differences:[]};
  const differences=['rows','digest','rls','forceRls','columnsDigest','policiesDigest','constraintsDigest','indexesDigest','triggersDigest','grantsDigest'].filter(k=>a[k]!==b[k]);
  return {table:id,state:differences.length?'requires_review':'matched',differences};
 });
 const functionsMatch=typeof source.functionsDigest==='string'&&/^[a-f0-9]{64}$/.test(source.functionsDigest)&&source.functionsDigest===recovery.functionsDigest;
 const extensionMap=m=>Array.isArray(m.extensions)&&m.extensions.length?m.extensions.map(e=>e.name+'@'+e.version).sort():null;
 const se=extensionMap(source),re=extensionMap(recovery),extensionsMatch=!!se&&!!re&&JSON.stringify(se)===JSON.stringify(re);
 return {version:1,sourceCapturedAt:source.capturedAt,recoveryCapturedAt:recovery.capturedAt,checks,functionsMatch,extensionsMatch,matched:checks.filter(c=>c.state==='matched').length,requiresReview:checks.filter(c=>c.state!=='matched').length,completeDatabaseMatch:functionsMatch&&extensionsMatch&&checks.every(c=>c.state==='matched'),
  limitations:['A current-source comparison does not establish a backup recovery point. Differences require review against the selected backup time and intervening changes.','Matching row digests do not verify Storage bytes, provider settings, Auth behaviour, permissions under real sessions, application recovery or external integrations.','This comparison does not approve a recovery exercise or independent security review.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4)throw Error('Usage: node scripts/compare-watchdog-recovery.mjs SOURCE.json RECOVERY.json');
 const result=compareRecovery(JSON.parse(await readFile(process.argv[2],'utf8')),JSON.parse(await readFile(process.argv[3],'utf8')));
 console.log(JSON.stringify(result,null,2));process.exitCode=result.completeDatabaseMatch?0:1;
}

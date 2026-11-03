import {describe,it,expect} from 'vitest';
// @ts-expect-error Reusable administrative utility deliberately runs as native JS.
import {compareRecovery} from '../scripts/compare-watchdog-recovery.mjs';
const table={schema:'public',table:'course_review_rounds',rows:3,digest:'a'.repeat(64),columnsDigest:'b'.repeat(64),policiesDigest:'c'.repeat(64),constraintsDigest:'d'.repeat(64),indexesDigest:'e'.repeat(64),triggersDigest:'f'.repeat(64),grantsDigest:'a'.repeat(64),rls:true,forceRls:false};
const inventory=()=>({version:1,capturedAt:'2026-11-03T06:00:00Z',tables:[{...table}],functionsDigest:'e'.repeat(64),extensions:[{name:'pgcrypto',version:'1.3'}]});
describe('recovery evidence comparison',()=>{
 it('confirms exact data, schema, policies and function digests',()=>{expect(compareRecovery(inventory(),inventory()).completeDatabaseMatch).toBe(true);});
 it.each(['digest','columnsDigest','policiesDigest','constraintsDigest','indexesDigest','triggersDigest','grantsDigest'])('does not pass changed %s',field=>{const a=inventory(),b=inventory();b.tables[0][field as keyof typeof table]='9'.repeat(64) as never;const r=compareRecovery(a,b);expect(r.completeDatabaseMatch).toBe(false);expect(r.checks[0].differences).toContain(field);});
 it('detects disabled row security despite unchanged data',()=>{const b=inventory();b.tables[0].rls=false;expect(compareRecovery(inventory(),b).completeDatabaseMatch).toBe(false);});
 it('detects missing tables without ignoring them',()=>{const a=inventory();a.tables.push({...table,table:'profiles'});expect(compareRecovery(a,inventory()).checks.find((c:{table:string})=>c.table==='public.profiles').state).toBe('missing_from_recovery');});
 it('detects extra recovery tables and changed functions',()=>{const b=inventory();b.tables.push({...table,table:'unexpected'});b.functionsDigest='f'.repeat(64);const r=compareRecovery(inventory(),b);expect(r.completeDatabaseMatch).toBe(false);expect(r.functionsMatch).toBe(false);});
 it('rejects truncated or duplicate inventories instead of returning a green result',()=>{expect(()=>compareRecovery({...inventory(),tables:[]},inventory())).toThrow();const b=inventory();b.tables.push({...table});expect(()=>compareRecovery(inventory(),b)).toThrow();});
 it('flags missing extensions as incomplete evidence',()=>{expect(compareRecovery(inventory(),{...inventory(),extensions:[]}).completeDatabaseMatch).toBe(false);});
});

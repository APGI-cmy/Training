import {test} from 'node:test';import assert from 'node:assert/strict';
import {observe} from './watchdog-external-observer.mjs';
const ready={version:2,status:'ready',probe:'encrypted_write_read_verified',checkedAt:new Date().toISOString(),bytesUsedPercent:10,filesUsedPercent:1};
async function archive(data,status=200){const result=await observe({fetcher:async url=>new Response(JSON.stringify(data),{status,headers:{'cache-control':'no-store'}})});return result.checks.find(c=>c.id==='archive_health');}
test('accepts recent encryption-and-persistence readiness',async()=>assert.equal((await archive(ready)).state,'passed'));
test('detects early byte/inode warnings and live warning drills',async()=>{
 for(const data of [{...ready,status:'attention',filesUsedPercent:75},{...ready,status:'attention',bytesUsedPercent:75},{...ready,status:'attention',monitorTest:true}])assert.equal((await archive(data)).state,'failed');
});
test('rejects obsolete shallow health, stale checks and failed encryption',async()=>{
 for(const data of [{status:'ready'},{...ready,checkedAt:'2020-01-01T00:00:00Z'},{...ready,probe:'encrypted_write_failed'},{...ready,bytesUsedPercent:80}])assert.equal((await archive(data)).state,'failed');
 assert.equal((await archive({...ready,status:'unavailable'},503)).state,'failed');
});

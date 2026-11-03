import test from 'node:test';
import assert from 'node:assert/strict';
import {observe} from './watchdog-external-observer.mjs';
const run=async archive=>observe({fetcher:async(url,options)=>{
 assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.headers.authorization,undefined);
 if(new URL(url).hostname==='apgi-v2-security-log-archive.onrender.com')return archive();
 return new Response('{}',{status:401,headers:{'cache-control':'no-store'}});
}});
test('archive readiness passes only a fresh ready response',async()=>{
 const result=await run(()=>new Response('{"status":"ready"}',{status:200,headers:{'cache-control':'no-store'}}));
 assert.equal(result.checks.find(c=>c.id==='archive_health').state,'passed');assert.equal(result.checks.length,7);
});
test('archive failed disk fails the outside monitor',async()=>{
 const result=await run(()=>new Response('{"status":"attention"}',{status:503,headers:{'cache-control':'no-store'}}));
 assert.equal(result.checks.find(c=>c.id==='archive_health').state,'failed');assert.equal(result.passed,false);
});
test('cached ready response does not count as readiness',async()=>{
 const result=await run(()=>new Response('{"status":"ready"}',{status:200}));
 assert.equal(result.checks.find(c=>c.id==='archive_health').state,'failed');
});
test('archive connection failure remains inconclusive',async()=>{
 const result=await run(()=>{throw Error('connection unavailable');});
 assert.equal(result.checks.find(c=>c.id==='archive_health').state,'inconclusive');assert.equal(result.passed,false);
});

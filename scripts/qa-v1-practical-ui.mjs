// Local-only Supabase HTTP adapter backed by the task's disposable PostgreSQL.
// Browser control is performed separately in the adjacent in-app browser.
import http from 'node:http';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
const container='apgi-v1-practical-qa-20261125',db='v1_practical_qa';
const admin='10000000-0000-4000-8000-000000000001', learner='10000000-0000-4000-8000-000000000003';
const apiPort=31346,appPort=31347,gatewayPort=31348;
const q=s=>`'${String(s).replaceAll("'","''")}'`;
function sql(s){const r=spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8'});if(r.status)throw Error(r.stderr);return r.stdout.trim();}
sql(`insert into public.profiles(user_id,full_name,certificate_name,email) values('${learner}','Local QA Learner','Local QA Learner','qa@example.invalid') on conflict do nothing;
insert into public.course_enrolments(user_id,course_id,status) values('${learner}','scannex-training-programme','enrolled') on conflict(user_id,course_id) do nothing;
insert into public.learner_progress(user_id,course_id,unit_id,status) select '${learner}','scannex-training-programme','scannex-lu-'||n,'completed' from generate_series(1,8)n on conflict do nothing;
insert into public.learners(id) values('${learner}'),('${admin}') on conflict do nothing;
do $$declare b uuid;p uuid;begin
if not exists(select 1 from public.assessment_bookings where learner_user_id='${learner}') then
insert into public.assessment_bookings(learner_user_id,course_id,created_by) values('${learner}','scannex-training-programme','${admin}') returning id into b;
select id into p from public.v1_practical_packs where status='approved' limit 1;
perform public.v1_practical_mutate('${admin}','assign',b,jsonb_build_object('packId',p));end if;end$$;`);
const objects=new Map();
const api=http.createServer(async(req,res)=>{
 const url=new URL(req.url,`http://127.0.0.1:${apiPort}`);let bytes=[];for await(const b of req)bytes.push(b);const raw=Buffer.concat(bytes);const token=req.headers.authorization||'';const user=token.includes('fixture-admin')?admin:learner;
 res.setHeader('access-control-allow-origin',`http://127.0.0.1:${gatewayPort}`);res.setHeader('access-control-allow-methods','PUT,POST,GET,OPTIONS');res.setHeader('access-control-allow-headers','content-type,x-upsert');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 try{
 let result=[];
 if(url.pathname==='/auth/v1/user')result={id:user,email:'qa@example.invalid',email_confirmed_at:'2026-01-01'};
 else if(url.pathname.startsWith('/storage/v1/object/upload/sign/')){
  const path=url.pathname.slice('/storage/v1/object/upload/sign/'.length);
  if(req.method==='POST')result={url:`/object/upload/sign/${path}?token=local-fixture-only`};
  else {if(objects.has(path)){res.writeHead(409);return res.end('{}');}objects.set(path,{bytes:raw,type:req.headers['content-type']});result={Key:path};}
 }else if(url.pathname.startsWith('/storage/v1/object/authenticated/')){
  const o=objects.get(url.pathname.slice('/storage/v1/object/authenticated/'.length));if(!o){res.writeHead(404);return res.end('{}');}res.setHeader('content-type',o.type);return res.end(o.bytes);
 }else if(url.pathname.startsWith('/rest/v1/rpc/')){
  const name=url.pathname.split('/').at(-1),args=JSON.parse(raw||'{}');
  if(name==='v1_course_benefit_state') result=JSON.parse(sql(`set role service_role;select public.v1_course_benefit_state(${q(args.p_user)});`));
  else if(name==='v1_practical_mutate')result=JSON.parse(sql(`set role service_role;select public.v1_practical_mutate(${q(args.p_actor)},${q(args.p_operation)},${args.p_id?q(args.p_id):'null'},${q(JSON.stringify(args.p_data))}::jsonb);`));
  else result=null;
 }else if(url.pathname.startsWith('/rest/v1/')){
  const table=url.pathname.split('/').at(-1);const allowed=['learners','user_roles','profiles','course_enrolments','learner_progress','completion_states','assessment_bookings','v1_practical_packs','v1_practical_assignments','v1_practical_files','v1_practical_submissions','v1_practical_reviews','v1_practical_events'];
  if(allowed.includes(table)){
   if(table==='v1_practical_events'&&req.method==='POST'){
    const event=JSON.parse(raw);sql(`insert into public.v1_practical_events(assignment_id,pack_id,actor_user_id,event_type,metadata) values(${event.assignment_id?q(event.assignment_id):'null'},${event.pack_id?q(event.pack_id):'null'},${q(event.actor_user_id)},${q(event.event_type)},${q(JSON.stringify(event.metadata))}::jsonb);`);res.writeHead(201);return res.end();
   }
   const select=url.searchParams.get('select')||'*';if(!/^[a-z_0-9*,]+$/.test(select))throw Error('Unsupported fixture select');
   const conditions=[];for(const[key,value]of url.searchParams){if(['select','order','limit'].includes(key))continue;if(!/^[a-z_0-9]+$/.test(key))continue;
    if(value.startsWith('eq.'))conditions.push(`${key}=${q(value.slice(3))}`);
    else if(value.startsWith('in.(')&&value.endsWith(')'))conditions.push(`${key} in (${value.slice(4,-1).split(',').map(q).join(',')})`);
   }
   if(table==='user_roles')conditions.push(`user_id=${q(user)}`);
   const order=url.searchParams.get('order');const orderSql=order&&/^[a-z_]+(\.(asc|desc))?$/.test(order)?` order by ${order.replace('.', ' ')}`:'';
   const limit=Number(url.searchParams.get('limit')||1000);
   result=JSON.parse(sql(`select coalesce(jsonb_agg(t),'[]'::jsonb) from (select ${select} from public.${table}${conditions.length?' where '+conditions.join(' and '):''}${orderSql} limit ${Math.min(limit,1000)})t;`));
  }
 }
 res.setHeader('content-type','application/json');res.end(JSON.stringify(result));
 }catch(e){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({message:e.message.match(/ERROR:  ([A-Z_]+)/)?.[1]||'FIXTURE_ERROR'}));console.error('Fixture API error',url.pathname,e.message);}
});
await new Promise(r=>api.listen(apiPort,'127.0.0.1',r));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(appPort)],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${apiPort}`,NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-fixture-only',SUPABASE_SERVICE_ROLE_KEY:'local-fixture-only'},stdio:['ignore','pipe','pipe']});
app.stdout.on('data',b=>process.stdout.write(b));app.stderr.on('data',b=>process.stderr.write(b));
const gateway=http.createServer((req,res)=>{
 if(req.url==='/__qa/learner'||req.url==='/__qa/admin'){
  const isAdmin=req.url.endsWith('/admin');res.writeHead(302,{'set-cookie':[`alp_access_token=fixture-${isAdmin?'admin':'learner'}; Path=/; HttpOnly; SameSite=Lax`,`alp_user_id=${isAdmin?admin:learner}; Path=/; HttpOnly; SameSite=Lax`],location:isAdmin?'/admin/assessments/practical':'/learn/scannex-training-programme/units/lu9/viewer-lab'});return res.end();
 }
 const proxy=http.request({host:'127.0.0.1',port:appPort,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});proxy.on('error',()=>{res.writeHead(503);res.end('Local fixture starting');});req.pipe(proxy);
});
gateway.on('upgrade',(req,socket,head)=>{
 const upstream=net.connect(appPort,'127.0.0.1',()=>{
  upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${Object.entries(req.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')}\r\n\r\n`);
  if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);
 });upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());
});
await new Promise(r=>gateway.listen(gatewayPort,'127.0.0.1',r));
console.log(`LOCAL FIXTURE ONLY: http://127.0.0.1:${gatewayPort}/__qa/learner and /__qa/admin`);
function stop(){app.kill();gateway.close();api.close();process.exit(0);}process.on('SIGINT',stop);process.on('SIGTERM',stop);

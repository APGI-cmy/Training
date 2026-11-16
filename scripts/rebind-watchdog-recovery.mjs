// Docker Desktop can override a network's default host binding. Before loading
// any backup, recreate only this drill's empty containers with explicit loopback
// bindings. Preserve their named volumes and configuration entirely in memory.
import http from 'node:http';
const suffix='_apgi-full-recovery-20261103-c';
function api(path,method='GET',body){return new Promise((resolve,reject)=>{const req=http.request({socketPath:'\\\\.\\pipe\\docker_engine',path,method,headers:body?{'content-type':'application/json'}:{}},res=>{let data='';res.on('data',b=>data+=b);res.on('end',()=>{if(res.statusCode>=400)reject(Error('Scoped Docker operation failed: '+res.statusCode));else resolve(data?JSON.parse(data):null);});});req.on('error',reject);req.end(body?JSON.stringify(body):undefined);});}
const all=await api('/containers/json?all=true');const containers=all.filter(c=>c.Names.some(n=>n.endsWith(suffix)));
if(containers.length!==6)throw Error('Unexpected drill container inventory');
const snapshots=[];for(const c of containers){const i=await api('/containers/'+c.Id+'/json');if(!i.Name.startsWith('/supabase_')||!i.Name.endsWith(suffix)||!i.Config.Image.startsWith('public.ecr.aws/supabase/'))throw Error('Unapproved recovery container');snapshots.push(i);if(i.State.Running)await api('/containers/'+i.Id+'/stop?t=10','POST');}
const ids=[];
for(const i of snapshots){
 const exposed=Object.values(i.HostConfig.PortBindings??{}).some(v=>v?.length);
 if(!exposed){ids.push({id:i.Id,name:i.Name});continue;}
 const bindings=Object.fromEntries(Object.entries(i.HostConfig.PortBindings).map(([port,entries])=>[port,[...new Set(entries.map(e=>e.HostPort))].map(HostPort=>({HostIp:'127.0.0.1',HostPort}))]));
 const endpoints=Object.fromEntries(Object.entries(i.NetworkSettings.Networks).map(([name,net])=>[name,{Aliases:net.Aliases?.filter(s=>s!==i.Id&&s!==i.Id.slice(0,12))}]));
 await api('/containers/'+i.Id,'DELETE');
 const created=await api('/containers/create?name='+encodeURIComponent(i.Name.slice(1)),'POST',{...i.Config,HostConfig:{...i.HostConfig,PortBindings:bindings},NetworkingConfig:{EndpointsConfig:endpoints}});
 ids.push({id:created.Id,name:i.Name});
}
ids.sort((a,b)=>(a.name.includes('_db_')?-1:b.name.includes('_db_')?1:0));
for(const c of ids)await api('/containers/'+c.id+'/start','POST');
for(const c of ids){const i=await api('/containers/'+c.id+'/json');for(const bindings of Object.values(i.HostConfig.PortBindings??{}))for(const b of bindings??[])if(b.HostIp!=='127.0.0.1')throw Error('Recovery port is not loopback-only');}
console.log(JSON.stringify({loopbackOnly:true,containers:ids.length,backupDataLoaded:false,volumesRetained:true}));

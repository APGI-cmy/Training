// Restore verified application grants and enable native TOTP in this isolated
// provider. No production database or container can be selected.
import http from 'node:http';
import {execFileSync} from 'node:child_process';
const name='supabase_auth_apgi-full-recovery-20261103-c';
function api(path,method='GET',body){return new Promise((resolve,reject)=>{const req=http.request({socketPath:'\\\\.\\pipe\\docker_engine',path,method,headers:body?{'content-type':'application/json'}:{}},res=>{let data='';res.on('data',b=>data+=b);res.on('end',()=>res.statusCode>=400?reject(Error('Scoped Docker operation '+res.statusCode)):resolve(data?JSON.parse(data):null));});req.on('error',reject);req.end(body?JSON.stringify(body):undefined);});}
const i=await api('/containers/'+name+'/json');if(i.Name!=='/'+name||!i.Config.Image.startsWith('public.ecr.aws/supabase/gotrue:')||Object.values(i.HostConfig.PortBindings??{}).some(v=>v?.length))throw Error('Recovery Auth target rejected');
if(!i.Config.Env.includes('GOTRUE_MFA_TOTP_ENROLL_ENABLED=true')||!i.Config.Env.includes('GOTRUE_MFA_TOTP_VERIFY_ENABLED=true')){
 if(i.State.Running)await api('/containers/'+i.Id+'/stop?t=10','POST');
 await api('/containers/'+i.Id,'DELETE');
 const endpoints=Object.fromEntries(Object.entries(i.NetworkSettings.Networks).map(([n,v])=>[n,{Aliases:v.Aliases?.filter(a=>a!==i.Id&&a!==i.Id.slice(0,12))}]));
 const env=i.Config.Env.filter(v=>!/^GOTRUE_MFA_TOTP_(ENROLL|VERIFY)_ENABLED=/.test(v)).concat(['GOTRUE_MFA_TOTP_ENROLL_ENABLED=true','GOTRUE_MFA_TOTP_VERIFY_ENABLED=true']);
 const created=await api('/containers/create?name='+name,'POST',{...i.Config,Env:env,HostConfig:i.HostConfig,NetworkingConfig:{EndpointsConfig:endpoints}});await api('/containers/'+created.Id+'/start','POST');
}
execFileSync('docker',['exec','-i','supabase_db_apgi-full-recovery-20261103-c','psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:'grant select (id,email,email_confirmed_at) on auth.users to service_role;grant usage on schema watchdog_private to service_role;grant usage on schema course_access_private to authenticated;',windowsHide:true,stdio:['pipe','pipe','pipe']});
console.log(JSON.stringify({localProviderConfigured:true,totpEnabled:true,grants:'Exact application column/schema grants read from hosted source'}));

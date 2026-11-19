"""One release gate for all registered deployments; source archives must already be uploaded.

python scripts/deploy-shared-release.py RELEASE_DIRECTORY --build
python scripts/deploy-shared-release.py RELEASE_DIRECTORY --promote
No credentials are read from files or printed. The authenticated Vercel CLI is used.
"""
import argparse,hashlib,json,subprocess,time,urllib.request,shutil,os
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REGISTRY=json.loads((ROOT/'src/data/platform-release.json').read_text())
TEAM=REGISTRY['teamId']
if os.name=='nt':
    cli=Path(shutil.which('vercel.cmd')).parent/'node_modules/vercel/dist/vc.js'
    if not cli.is_file():raise RuntimeError('Verified Vercel CLI entry point missing')
    CLI=[shutil.which('node'),str(cli)]
else:CLI=['vercel']

def api(path,method='GET',body=None):
    args=CLI+['api',path+('&' if '?' in path else '?')+'teamId='+TEAM,'--method',method]
    if body:args+=['--input',str(body)]
    result=subprocess.run(args,capture_output=True,text=True)
    if result.returncode:raise RuntimeError('Vercel API action failed: '+path)
    return json.loads(result.stdout or '{}')

def save(path,data):path.write_text(json.dumps(data,indent=2))
def context_for(directory,target):
    context=directory/'target-contexts'/target['project'];(context/'.vercel').mkdir(parents=True,exist_ok=True)
    save(context/'.vercel/project.json',{'projectId':target['project'],'orgId':TEAM,'projectName':target['projectName']})
    return context

def verify_built_application(directory,target):
    context=context_for(directory,target)
    result=subprocess.run(CLI+['curl','/api/platform-version','--deployment','https://'+target['url'],'--scope',REGISTRY['teamSlug'],'--cwd',str(context),'--','--silent','--show-error','--fail'],capture_output=True,text=True)
    if result.returncode:raise RuntimeError('Protected build readiness check failed for '+target['project'])
    data=json.loads(result.stdout)
    if data.get('version')!=REGISTRY['version'] or data.get('paymentsDisabled') is not True or data.get('schemaReady') is not True:raise RuntimeError('Build version, schema or payment guard is not ready')

def main():
    p=argparse.ArgumentParser();p.add_argument('release_directory',type=Path);p.add_argument('--build',action='store_true');p.add_argument('--promote',action='store_true');a=p.parse_args()
    if a.build==a.promote:raise ValueError('Choose build or promote')
    directory=a.release_directory.resolve();requests=[]
    if os.name=='nt':
        syncroot=Path(os.environ.get('OneDrive',r'C:\Users\Johan\OneDrive')).resolve()
        if directory==syncroot or syncroot in directory.parents:raise ValueError('Release build state must stay outside OneDrive')
    for target in REGISTRY['targets']:
        file=directory/(target['project']+'.json');r=json.loads(file.read_text())
        if r.get('project')!=target['project'] or r.get('target')!='production' or r.get('autoAssignCustomDomains') is not False:raise ValueError('Incorrect target or unsafe automatic promotion')
        if r.get('meta',{}).get('platformVersion')!=REGISTRY['version']:raise ValueError('Release version mismatch')
        requests.append((target,file,r))
    sources=[hashlib.sha256(json.dumps(r['files'],sort_keys=True).encode()).hexdigest() for _,_,r in requests]
    commits={r.get('meta',{}).get('sourceCommit') for _,_,r in requests}
    if len(set(sources))!=1 or len(commits)!=1 or None in commits:raise ValueError('Every platform must use identical source archives and source commit')
    auditfile=directory/'coordinated-release.json'
    if a.build:
        if auditfile.exists():raise ValueError('A release already exists here; inspect it rather than creating duplicate builds')
        audit={'version':REGISTRY['version'],'sourceCommit':next(iter(commits)),'archivesSha256':sources[0],'targets':[],'stage':'building'}
        # Capture current releases before starting any new build.
        for target,file,r in requests:
            project=api('/v9/projects/'+target['project'])
            previous=project.get('targets',{}).get('production',{}).get('id')
            if not previous:raise ValueError('Verified rollback deployment missing for '+target['project'])
            audit['targets'].append({**target,'previous':previous,'projectName':project['name'],'request':str(file)})
        save(auditfile,audit)
        for t in audit['targets']:
            deployment=api('/v13/deployments','POST',Path(t['request']))
            t['deployment']=deployment['id'];t['url']=deployment['url'];save(auditfile,audit)
            print(json.dumps({'project':t['project'],'deployment':t['deployment'],'state':deployment.get('readyState')}),flush=True)
        deadline=time.time()+1800
        while time.time()<deadline:
            states=[]
            for t in audit['targets']:
                d=api('/v13/deployments/'+t['deployment']);state=d.get('readyState');t['state']=state;states.append(state)
                if d.get('meta',{}).get('sourceCommit')!=audit['sourceCommit'] or d.get('projectId')!=t['project']:raise ValueError('Deployment identity mismatch')
            save(auditfile,audit)
            print(json.dumps({'buildStates':states}),flush=True)
            if any(s in ['ERROR','CANCELED'] for s in states):raise RuntimeError('A platform build failed; none were promoted')
            if all(s=='READY' for s in states):
                for t in audit['targets']:verify_built_application(directory,t)
                audit['stage']='all_ready';save(auditfile,audit);return
            time.sleep(10)
        raise RuntimeError('Build deadline reached; inspect recorded builds before retrying')
    audit=json.loads(auditfile.read_text())
    if audit['version']!=REGISTRY['version'] or audit['sourceCommit']!=next(iter(commits)) or audit['archivesSha256']!=sources[0] or audit['stage']!='all_ready':raise ValueError('Unverified release cannot be promoted')
    promoted=[]
    try:
        for t in audit['targets']:
            d=api('/v13/deployments/'+t['deployment'])
            project=api('/v9/projects/'+t['project'])
            if d.get('readyState')!='READY' or project.get('targets',{}).get('production',{}).get('id')!=t['previous']:raise ValueError('Build status or current release changed; re-review before promotion')
            verify_built_application(directory,t)
        for t in audit['targets']:
            context=context_for(directory,t)
            t['context']=str(context)
            result=subprocess.run(CLI+['promote','https://'+t['url'],'--yes','--scope',REGISTRY['teamSlug'],'--cwd',str(context)],capture_output=True,text=True)
            if result.returncode:raise RuntimeError('Promotion failed for '+t['project'])
            promoted.append(t);t['promoted']=True;save(auditfile,audit)
        for t in audit['targets']:
            for attempt in range(12):
                try:
                    with urllib.request.urlopen(t['origin']+'/api/platform-version',timeout=20) as response:version=json.load(response)
                    if version.get('version')==REGISTRY['version'] and version.get('paymentsDisabled') is True and version.get('schemaReady') is True:break
                except Exception:pass
                time.sleep(5)
            else:raise RuntimeError('Live version or disabled-payment verification failed')
            project=api('/v9/projects/'+t['project'])
            if project.get('targets',{}).get('production',{}).get('id')!=t['deployment']:raise RuntimeError('Live deployment identity mismatch')
        audit['stage']='verified';save(auditfile,audit);print(json.dumps({'stage':'verified','version':audit['version']}),flush=True)
    except Exception:
        audit['stage']='rollback_required'
        for t in reversed(promoted):
            r=subprocess.run(CLI+['rollback',t['previous'],'--yes','--scope',REGISTRY['teamSlug'],'--cwd',t['context']],capture_output=True,text=True)
            t['rollbackSucceeded']=r.returncode==0
        save(auditfile,audit);raise

if __name__=='__main__':main()

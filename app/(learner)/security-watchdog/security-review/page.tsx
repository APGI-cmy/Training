import Link from 'next/link';
import {requireSession} from '@/server/auth/session';
import {watchdogAccess,checkWatchdogScope} from '@/server/security-watchdog/access';
import {securityReviewBrief} from '@/lib/watchdog-review-brief';
import '../watchdog.css';
export const dynamic='force-dynamic';
export const metadata={title:'Independent security review brief'};
export default async function SecurityReviewBrief({searchParams}:{searchParams:Promise<{scope?:string}>}){
 const access=await watchdogAccess(await requireSession()),query=await searchParams;
 const scope=query.scope==='platform'?null:query.scope??(access.principal?null:access.ownedCompanyIds[0]);
 if(scope===undefined)return <main className="watchdog-page"><h1>Independent security review</h1><p>No active company scope is available for your account.</p></main>;
 checkWatchdogScope(access,scope);
 return <main className="watchdog-page"><p className="eyebrow">Security Watchdog</p><h1>Independent security review</h1><p className="watchdog-note"><strong>Prepared — reviewer appointment and independent testing remain outstanding.</strong> This brief keeps security review separate from course approval and learner competency decisions.</p><div className="watchdog-actions"><Link className="secondary-button" href={'/security-watchdog?scope='+(scope??'platform')}>Back to Watchdog</Link><a className="primary-button" href={'/api/security-watchdog/review-brief?scope='+(scope??'platform')}>Download review brief</a></div>{securityReviewBrief(scope===null?'APGI Training V2 staging — whole platform':'Your selected company only').map(s=><section className="watchdog-box" key={s.title}><h2>{s.title}</h2><ul>{s.text.map(t=><li key={t}>{t}</li>)}</ul></section>)}</main>;
}

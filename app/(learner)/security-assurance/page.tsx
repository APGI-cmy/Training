import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {securityAssurance} from '@/server/security-watchdog/assurance';
import {WatchdogError} from '@/server/security-watchdog/access';
import {stateLabel} from '@/lib/security-watchdog';
export const dynamic='force-dynamic';
export default async function SecurityAssurance(){
 let report;try{report=await securityAssurance();}catch(e){if(e instanceof WatchdogError&&e.status===401)redirect('/alp-sign-in?next=%2Fsecurity-assurance');notFound();}
 return <main className="admin-page"><header><p className="eyebrow">Your information</p><h1>Payment and personal information protection</h1><p>Clear results for the controls tested, with the date and limits of that evidence.</p></header>
 <section className="admin-form-card"><h2>{report.current?'Latest verified protection checks':'Current checks need verification'}</h2><p>{report.payment.passed} of {report.payment.total} named payment protection checks passed.</p><p>{report.checkedAt?`Last completed: ${new Date(report.checkedAt).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})} SAST.`:'No current verified result is available.'}</p>
 <p><strong>V2 sandbox only. Live payment acceptance remains untested.</strong></p><p>Use Stripe-hosted forms for card and bank information. The platform payment setup collects routing and verification status, rather than card or bank account numbers. Never send these numbers, passwords or security codes through course feedback, messages or attachments.</p>
 <ul>{report.payment.checks.map(c=><li key={c.title}><strong>{stateLabel(c.state)}</strong> — {c.title}</li>)}</ul></section>
 <section className="admin-form-card"><h2>What this means for you</h2><p>{report.explanation}</p><p>The checks exercise access separation with fictional accounts. They do not inspect your personal bank account or establish that your individual records have never been disclosed.</p>{report.audience!=='learner'?<p><Link href={report.reportHref}>{report.audience==='principal'?'Open full platform security report':'Open your company security report'}</Link></p>:null}</section>
 <section className="admin-form-card"><h2>Standards and responsibilities</h2><p><a href="https://www.pcisecuritystandards.org/standards/pci-dss/">PCI DSS</a> addresses payment-card information security. <a href="https://www.iso.org/standard/27001">ISO/IEC 27001</a> addresses information security management. These platform test results do not claim either certification. APGI’s applicable PCI validation and provider responsibilities require separate confirmation.</p><p><a href="https://docs.stripe.com/security/guide">How Stripe-hosted payment collection protects card information</a> · <Link href="/messages">Contact support</Link></p></section></main>;
}

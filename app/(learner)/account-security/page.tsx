import {redirect} from 'next/navigation';
import {securityAccount} from '@/server/security-watchdog/account-security';
import {AccountSecurity} from '@/components/security-watchdog/AccountSecurity';
import '../security-watchdog/watchdog.css';
export const dynamic='force-dynamic';
export const metadata={title:'My account security'};
export default async function AccountSecurityPage(){const account=await securityAccount().catch(()=>null);if(!account)redirect('/alp-sign-in?next=%2Faccount-security');return <main className="watchdog-page"><p className="eyebrow">Private account security</p><h1>My authenticator</h1><p>This setup belongs to {account.session.user.email}.</p><AccountSecurity factors={account.factors} mfaRequired={account.mfaRequired}/></main>;}

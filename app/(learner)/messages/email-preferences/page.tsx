import Link from 'next/link';
import {notificationSession} from '@/server/services/notifications';
import {messageRpc} from '@/server/services/messages';
import {EmailPreferenceForm} from '@/components/messages/EmailWorkbench';
import '../messages.css';
import '../email-sets/workbench.css';
export const dynamic='force-dynamic';
export default async function EmailPreferences(){const session=await notificationSession();const companies=await messageRpc<{id:string;name:string;announcements:boolean}[]>('v2_email_preference',{p_actor:session.user.id});return <main className="message-page email-workbench"><h1>My email preferences</h1><p>Choose whether to receive course announcements and promotions from each company. You can turn these off at any time.</p>{companies.map(c=><section key={c.id}><EmailPreferenceForm company={c}/></section>)}<Link href="/messages">Return to Messages and support</Link></main>;}

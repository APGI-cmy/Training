import { requireAdmin } from '@/lib/auth/require-admin';
import { adminRest } from '@/server/supabase/admin-rest';
export default async function TestMessages(){
  await requireAdmin();
  const r=await adminRest('/rest/v1/staging_auth_messages?select=id,recipient_email,purpose,action_url,created_at&order=created_at.desc&limit=50');
  if(!r.ok)throw new Error('Test messages are unavailable.');
  const messages=await r.json() as Array<{id:string;recipient_email:string;purpose:string;action_url:string;created_at:string}>;
  return <main className="admin-page"><h1>Test messages</h1><p>Staging only: confirmation and recovery links are captured here instead of being emailed. Give each link only to the matching test account. Links expire and can be used once; these records contain no passwords.</p>{messages.map(m=><article className="admin-form-card" key={m.id}><strong>{m.recipient_email}</strong><p>{m.purpose} · {new Date(m.created_at).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})}</p><a href={m.action_url} target="_blank" rel="noopener noreferrer">Open {m.purpose} link</a></article>)}{!messages.length?<p>No test messages yet.</p>:null}</main>;
}

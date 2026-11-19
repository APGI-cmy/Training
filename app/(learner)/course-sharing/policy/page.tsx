import Link from 'next/link';
import {requireSession} from '@/server/auth/session';
import policy from '@/data/course-sharing-policy.json';
export default async function SharingPolicyPage(){await requireSession();return <main className="admin-page"><h1>{policy.title}</h1><p><strong>{policy.version} · {policy.status}</strong></p><p><Link href="/course-sharing">Back to course shelf</Link> · <Link href="/admin/policies">Policy review and sign-off</Link></p><article className="admin-form-card" style={{whiteSpace:'pre-wrap',lineHeight:1.75}}>{policy.body}</article></main>;}

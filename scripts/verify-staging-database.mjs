import nextEnv from '@next/env';
import { assertStagingIsolation } from '../src/server/environment-isolation.ts';
nextEnv.loadEnvConfig(process.cwd());
assertStagingIsolation();
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const headers = { apikey: secret, authorization: `Bearer ${secret}` };
for (const table of ['learners', 'course_enrolments', 'scorm_attempts', 'course_invitations']) {
  const result = await fetch(`${base}/rest/v1/${table}?select=*&limit=1`, { headers: { ...headers, Prefer: 'count=exact' } });
  if (!result.ok) throw new Error(`Isolated database access failed for ${table}: ${result.status}`);
  console.log(`${table}: ${result.headers.get('content-range')}`);
}
const auth = await fetch(`${base}/auth/v1/admin/users?page=1&per_page=1`, { headers });
if (!auth.ok) throw new Error(`Test auth access failed: ${auth.status}`);
const users = await auth.json();
console.log(`Isolated auth users: ${users.users.length}`);
const anon = await fetch(`${base}/rest/v1/course_invitations?select=id&limit=1`, { headers: { apikey: publicKey, authorization: `Bearer ${publicKey}` } });
if (anon.ok && (await anon.json()).length !== 0) throw new Error('Anonymous invitation access was not isolated');
console.log(`Anonymous invitation access: ${anon.status}`);

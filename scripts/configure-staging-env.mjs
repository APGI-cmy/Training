// Staging-only provisioning helper. Credentials stay out of command arguments,
// terminal output and Git; a temporary ignored request is removed after use.
import nextEnv from '@next/env';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { assertStagingIsolation, STAGING_PROJECT_ID } from '../src/server/environment-isolation.ts';
nextEnv.loadEnvConfig(process.cwd());
assertStagingIsolation();
const link = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
if (link.projectId !== STAGING_PROJECT_ID || link.orgId !== 'team_KOQzed54bA9hTgta0YarblZq') throw new Error('Wrong project linkage');
const keys = ['ALP_ENVIRONMENT', 'ALP_STAGING_DATABASE_REF', 'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_APP_URL', 'ALP_EMAIL_MODE', 'ALP_PAYMENTS_MODE',
  'SCANNEX_VIEWER_LAB_ENABLED', 'PRIVATE_FILE_BUCKET', 'SUPABASE_SERVICE_ROLE_KEY', 'CERTIFICATE_SIGNING_SECRET',
  'STAGING_EMAIL_SCOPE', 'STAGING_RESEND_API_KEY', 'STAGING_EMAIL_FROM'];
const request = '.vercel/staging-env-request.json';
try {
  for (const key of keys) {
    if (!process.env[key]) continue;
    const secret = key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'CERTIFICATE_SIGNING_SECRET' || key === 'STAGING_RESEND_API_KEY';
    writeFileSync(request, JSON.stringify({ key, value: process.env[key], type: secret ? 'sensitive' : 'plain', target: secret ? ['production', 'preview'] : ['production', 'preview', 'development'] }));
    const command = `& npx --yes vercel@64.0.2 api '/v10/projects/${STAGING_PROJECT_ID}/env?teamId=team_KOQzed54bA9hTgta0YarblZq&upsert=true' --method POST --input .vercel/staging-env-request.json --silent`;
    execFileSync('powershell.exe', ['-NoProfile', '-Command', command], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`Configured staging variable: ${key}`);
  }
} finally {
  try { unlinkSync(request); } catch { /* Nothing to remove if the request was never written. */ }
}

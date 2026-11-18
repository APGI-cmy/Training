// Isolated local UI/HTTP fixture. It never contacts a hosted Supabase project.
// Run after next build. Set APGI_QA_PLAYWRIGHT_MODULE to a verified playwright module.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

if (!process.env.APGI_QA_PLAYWRIGHT_MODULE || !process.env.APGI_QA_OUTPUT) throw Error('Explicit local QA runtime and output required');
const { chromium } = await import(pathToFileURL(process.env.APGI_QA_PLAYWRIGHT_MODULE).href);
const out = resolve(process.env.APGI_QA_OUTPUT); await mkdir(out, { recursive: true });
const user = '00000000-0000-4000-8000-000000000001';
const certId = '00000000-0000-4000-8000-000000000099';
const cert = { id: certId, learner_user_id: user, learner_name: 'Local QA Learner', kind: 'attendance', issued_at: '2026-11-18T10:00:00Z', revoked_at: null, assessment_id: 'fixture' };
const events = [], errors = []; let issued = false;
const mock = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8877');
  let body = ''; for await (const chunk of req) body += chunk;
  res.setHeader('content-type', 'application/json');
  let result = [];
  if (url.pathname === '/auth/v1/user') result = { id: user, email: 'qa@example.invalid', email_confirmed_at: '2026-01-01' };
  else if (url.pathname.endsWith('/profiles')) result = [{ user_id: user, full_name: 'Local QA Learner', certificate_name: 'Local QA Learner', country: 'Namibia' }];
  else if (url.pathname.endsWith('/course_enrolments')) result = [{ status: 'enrolled' }];
  else if (url.pathname.endsWith('/user_roles')) result = [{ role: 'learner' }];
  else if (url.pathname.endsWith('/learner_progress')) result = Array.from({length: 8}, (_, i) => ({ unit_id: `scannex-lu-${i+1}`, status: 'completed' }));
  else if (url.pathname.endsWith('/rpc/v1_course_benefit_state')) result = { runId: '00000000-0000-4000-8000-000000000088', attemptNumber: 1, learningComplete: true, failed: true, passed: false, attendanceEligible: true, request: null, certificates: issued ? [cert] : [] };
  else if (url.pathname.endsWith('/rpc/v1_issue_certificate')) { assert.equal(JSON.parse(body).p_kind, 'attendance'); issued = true; result = certId; }
  else if (url.pathname.endsWith('/v1_course_certificates')) result = url.searchParams.get('id') === `eq.${certId}` && url.searchParams.get('learner_user_id') === `eq.${user}` ? [cert] : [];
  else if (url.pathname.endsWith('/v1_course_benefit_events') && req.method === 'POST') { events.push(JSON.parse(body)); res.writeHead(201); return res.end(''); }
  else if (req.method !== 'GET') { res.writeHead(400); return res.end(JSON.stringify({ message: 'Unexpected fixture mutation' })); }
  res.end(JSON.stringify(result));
});
await new Promise(r => mock.listen(0, '127.0.0.1', r));
const mockUrl = `http://127.0.0.1:${mock.address().port}`;
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '31281'], {
  cwd: process.cwd(), env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: mockUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-local-fixture', SUPABASE_SERVICE_ROLE_KEY: 'isolated-local-fixture' }, stdio: ['ignore','pipe','pipe']
});
let logs = ''; app.stdout.on('data', b => logs += b); app.stderr.on('data', b => logs += b);
let browser;
try {
  for (let i=0; i<50; i++) { try { if ((await fetch('http://127.0.0.1:31281/privacy')).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch({headless: true, channel: 'msedge'});
  const context = await browser.newContext({ viewport: {width: 1440,height: 1100}, acceptDownloads: true });
  await context.addCookies([{name: 'alp_access_token',value: 'local-fixture-only',url: 'http://127.0.0.1:31281'}, {name:'alp_user_id',value:user,url:'http://127.0.0.1:31281'}]);
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  page.on('response', async response => {
    if (response.url().includes('/resources/download')) {
      console.log('Download HTTP status:',response.status(),response.headers()['content-type']);
      if (response.status()!==200) console.log('Download rejection:',await response.text());
    }
  });
  const base = 'http://127.0.0.1:31281/learn/scannex-training-programme';
  await page.goto(base); await page.getByRole('heading',{name:'Your Scannex e-books'}).waitFor();
  assert.equal(await page.getByText('Download unit e-book', {exact: true}).count(), 9);
  await page.screenshot({path: resolve(out,'course-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), 'Mobile horizontal overflow');
  await page.screenshot({path: resolve(out,'course-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1100});
  await page.getByRole('link',{name:'Download complete e-book'}).click();
  await page.getByRole('heading',{name:'Copyright acknowledgement'}).waitFor();
  await page.locator('[name=signature]').fill('Local QA Learner'); await page.locator('[name=agree]').check();
  await page.screenshot({path:resolve(out,'signed-download.png'),fullPage:true});
  const download = page.waitForEvent('download'); await page.getByRole('button',{name:'Agree, sign and download PDF'}).click();
  await (await download).saveAs(resolve(out,'downloaded-full-book.pdf'));
  const manifest = JSON.parse(await readFile('private/course-books/scannex/manifest.json','utf8'));
  assert.equal(createHash('sha256').update(await readFile(resolve(out,'downloaded-full-book.pdf'))).digest('hex'), manifest.resources[0].sha256);
  assert.equal(events.filter(e => e.event_type==='ebook_download_authorised').length,1);
  await page.goto(base); await page.getByRole('button',{name:'Prepare attendance certificate'}).click();
  // Revalidation replaces the issue form with the durable certificate link.
  await page.getByRole('link',{name:'Open attendance certificate',exact:true}).click();
  await page.getByRole('heading',{name:'Certificate of Attendance'}).waitFor();
  await page.screenshot({path:resolve(out,'attendance-certificate.png'),fullPage:true});
  await page.emulateMedia({media:'print'}); await page.pdf({path:resolve(out,'attendance-certificate-print.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.emulateMedia({media:'screen'});
  await page.evaluate(() => window.print = () => { window.__qaPrintRequested = true; });
  await page.getByRole('button',{name:'Print / save certificate as PDF'}).click();
  await page.waitForFunction(() => window.__qaPrintRequested===true);
  assert.equal(events.filter(e=>e.event_type==='certificate_print_requested').length,1);
  const foreign = await context.request.get(`${base}/certificates/00000000-0000-4000-8000-000000000100`);
  const missingPage = await foreign.text();
  // With a streamed layout Next can return a soft 404; no certificate may render.
  assert.ok(!missingPage.includes('Certificate of Attendance'));
  assert.match(missingPage,/Learning page not found|NEXT_HTTP_ERROR_FALLBACK;404/);
  assert.equal(errors.length,0,errors.join('\n'));
  await writeFile(resolve(out,'browser-verification.json'),JSON.stringify({mode:'LOCAL FIXTURE - NOT LIVE LEARNER DATA',courseCards:9,desktop:true,mobileNoOverflow:true,signedDownloadHashMatched:true,attendanceCertificate:true,printAudit:true,foreignCertificateDenied:true,pageErrors:errors,events:events.map(e=>e.event_type)},null,2));
  console.log('PASS: local course UI, 9 unit downloads, signed full-book download and hash, attendance certificate, print audit, ownership and mobile layout');
} finally { await browser?.close(); app.kill(); await new Promise(r=>mock.close(r)); await writeFile(resolve(out,'local-server.log'),logs); await writeFile(resolve(out,'local-fixture-events.json'),JSON.stringify(events,null,2)); }

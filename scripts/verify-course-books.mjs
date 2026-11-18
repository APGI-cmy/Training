import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const folder = join(process.cwd(), 'private/course-books/scannex');
const manifest = JSON.parse(await readFile(join(folder,'manifest.json'),'utf8'));
if (manifest.resources.length !== 10) throw Error('Expected the full Scannex book and nine unit books.');
for (const book of manifest.resources) {
  if (!/^[a-z0-9-]+\.pdf$/.test(book.filename)) throw Error('Invalid book filename.');
  let bytes;
  if(process.env.VERCEL === '1') {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(base !== 'https://ooujszdvncwijbuzpjfp.supabase.co' || !key) throw Error('V1 private storage configuration is required for release.');
    const response = await fetch(`${base}/storage/v1/object/authenticated/v1-scannex-course-books/${manifest.version}/${book.filename}`,{headers:{apikey:key,authorization:`Bearer ${key}`}});
    if(!response.ok) throw Error(`Private storage asset unavailable: ${book.id}`);
    bytes = Buffer.from(await response.arrayBuffer());
  } else {
    try { bytes = await readFile(join(folder, book.filename)); }
    catch { throw Error(`Local QA asset missing: ${book.id}. Assemble the owner-approved Complete Guide books before local testing. PDFs must not be committed to the public repository.`); }
  }
  if (bytes.length !== book.bytes || createHash('sha256').update(bytes).digest('hex') !== book.sha256) throw Error(`Book integrity check failed: ${book.id}`);
}
console.log('Private course-book verification passed: 10 PDF assets match the approved manifest.');

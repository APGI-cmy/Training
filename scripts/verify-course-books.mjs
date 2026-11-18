import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const folder = join(process.cwd(), 'private/course-books/scannex');
const manifest = JSON.parse(await readFile(join(folder,'manifest.json'),'utf8'));
if (manifest.resources.length !== 10) throw Error('Expected the full Scannex book and nine unit books.');
for (const book of manifest.resources) {
  if (!/^[a-z0-9-]+\.pdf$/.test(book.filename)) throw Error('Invalid book filename.');
  let bytes;
  try { bytes = await readFile(join(folder, book.filename)); }
  catch { throw Error(`Private release asset missing: ${book.id}. Assemble the owner-approved Complete Guide books before deploying. PDFs must not be committed to the public repository.`); }
  if (bytes.length !== book.bytes || createHash('sha256').update(bytes).digest('hex') !== book.sha256) throw Error(`Book integrity check failed: ${book.id}`);
}
console.log('Private course-book verification passed: 10 PDF assets match the approved manifest.');

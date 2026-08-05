import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const courseRoot = join(process.cwd(), 'public', 'courses');
const lfsPointerPrefix = 'version https://git-lfs.github.com/spec/v1';

async function collectMedia(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const media = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      media.push(...await collectMedia(path));
    } else if (entry.isFile() && path.toLowerCase().endsWith('.mp4')) {
      media.push(path);
    }
  }

  return media;
}

const media = await collectMedia(courseRoot);
const invalid = [];

for (const path of media) {
  const [bytes, details] = await Promise.all([readFile(path), stat(path)]);
  const header = bytes.subarray(0, 128).toString('utf8');

  if (header.startsWith(lfsPointerPrefix)) {
    invalid.push(`${relative(process.cwd(), path)} (Git LFS pointer, ${details.size} bytes)`);
  }
}

if (invalid.length > 0) {
  console.error('Course-media verification failed: Git LFS pointer file(s) would be deployed instead of MP4 media.');
  for (const path of invalid) console.error(`- ${path}`);
  process.exitCode = 1;
} else {
  console.log(`Course-media verification passed: ${media.length} MP4 file(s) are real media objects.`);
}

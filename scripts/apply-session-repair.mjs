// Asset-preserving recovery build for the exact V1 production archive.
// This helper is fetched by immutable Git commit, not from a moving branch.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

const sourceCommit = "133a1b41e69c1e05a3bea35cf14a837690f17e2c";
const files = [
  ["src/server/auth/session-cookie-policy.ts", null, "f25bbf620a8ab1ad9eb173d543ad7d9e271310e0409812022f8daf2ca0d9d6ea"],
  ["src/server/auth/refresh-portal-session.ts", null, "82fb1ce8883d16865101669a477b7bf4f0a1cd3735a0d2a404b489448d348441"],
  ["proxy.ts", null, "594affe3004aec97b323af410db564ca2828be5d331141ad95d861cf68c061d1"],
  ["src/server/auth/session.ts", "d93ea2dfe84c581689a9f9a4682244ac32be05807f017aa75fd528e07576bc27", "2cb744dbf9f872fd995ad5da7fb69fbc9e3324d3d924c3ec2e2d9352f7b1f198"],
  ["app/alp-sign-in/page.tsx", "ff64123e8516b2b27d2bf62523f150fc085db47318616789ba9340346e791035", "b49e4f5b5deeecda017c0204cc54b473dee8abf92e492613d52eafdd49bbd826"],
  ["src/components/course/ViewerPracticeGuide.tsx", "0e37c25a7f586e232281a026b8d089d97b6d41176f53e42ce9edb27a1d314686", "d1483beb7fe3950750689b4053d616a369d50668d6eb42a1ebd6997ac0f6ac54"],
  ["app/(learner)/learn/[courseSlug]/units/[unitSlug]/viewer-lab/page.tsx", "ca8ed1aacbc9de3d99cd99bb132428d34cd701c0f589e6ca31428ddfdf93f6d6", "9a00d43087fc7688bcd58c2b1d380e291ab04b39758599bc0b2143da1c250ae0"],
  ["tests/learner-release-session-refresh.spec.ts", null, "84930adee696c5b18111ddf774cd31fbb8ab50cfdea09cc0182b283497f42547"]
];
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const replacements = [];
for (const [path, expectedBefore, expectedAfter] of files) {
  let current = null;
  try { current = await readFile(path); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const currentHash = current === null ? null : digest(current);
  if (currentHash !== expectedBefore && currentHash !== expectedAfter) {
    throw new Error(`Unexpected V1 baseline; refusing to replace ${path}`);
  }
  const response = await fetch(`https://raw.githubusercontent.com/APGI-cmy/Training/${sourceCommit}/${path}`);
  if (!response.ok) throw new Error(`Cannot retrieve pinned repair file: ${path} (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (digest(bytes) !== expectedAfter) throw new Error(`Repair checksum mismatch: ${path}`);
  replacements.push({ path, bytes });
}
// Validate every source and baseline before changing any application file.
for (const { path, bytes } of replacements) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}
console.log(`Verified and applied ${replacements.length} V1 session repair files at ${sourceCommit}; course assets untouched.`);

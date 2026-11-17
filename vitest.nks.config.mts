import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./tests/fixtures/server-only.ts',import.meta.url))}},test:{include:['tests/nks-launch*.spec.ts','tests/nks-launch*.spec.tsx','tests/tiger-watermark*.spec.ts','tests/learner-release-course-reviews.spec.ts','tests/learner-release-lu-review*.spec.*','tests/learner-release-password-recovery.spec.ts']}});

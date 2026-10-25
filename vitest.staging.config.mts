import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./tests/fixtures/server-only.ts',import.meta.url))}},test:{include:['tests/v2-staging-integration.spec.ts','tests/v2-staging-signup.spec.ts','tests/v2-password-recovery-integration.spec.ts'],testTimeout:60000,hookTimeout:60000}});

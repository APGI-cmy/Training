import nextEnv from '@next/env';
import { assertStagingIsolation } from '../src/server/environment-isolation.ts';
nextEnv.loadEnvConfig(process.cwd());
assertStagingIsolation();
console.log(`V2 hosting/database boundaries verified; payments and Viewer are disabled. Email mode: ${process.env.ALP_EMAIL_MODE}.`);

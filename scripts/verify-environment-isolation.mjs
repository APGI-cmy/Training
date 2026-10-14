import nextEnv from '@next/env';
import { assertStagingIsolation } from '../src/server/environment-isolation.ts';
nextEnv.loadEnvConfig(process.cwd());
assertStagingIsolation();
console.log('V2 staging boundaries verified; live services are disconnected.');

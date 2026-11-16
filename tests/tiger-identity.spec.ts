import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import compatibility from '@/data/course-review-engine-compatibility.json';
import manifest from '@/data/course-review-manifest.json';
import identities from '@/data/course-content-identities.json';

describe('Exact host-adapter compatibility checkpoint',()=>{
 it('binds the compatibility exemption to the exact tested shared engine bytes',()=>{
  const hash=createHash('sha256');
  for(const path of ['src/lib/courses.ts','src/components/course/ScormPlayer.tsx','src/components/QuizEngine.tsx','src/components/assessments/ScannexTheoryAssessment.tsx','src/server/assessments/scannex-theory-bank.ts','src/lib/services/courses/get-unit-content.ts'])hash.update(readFileSync(path,'utf8').replaceAll('\r\n','\n'));
  expect(hash.digest('hex')).toBe(compatibility.engine);
  expect(manifest.source).toBe(compatibility.legacySource);
 });
 it('retains the verified deployed authored-course identities',()=>{
  expect(Object.fromEntries(Object.entries(identities.courses).map(([id,record])=>[id,record.fingerprint]))).toEqual({
   'vpshr-level-0':'ec3b6a49faa2949ca97d55db2475d3954db3f2ac80a67748d905be3783d3bff5',
   'scannex-training-programme':'c4045e87eb27f1f98e5c8dff0a4c7c1c6bba2a8f93838110b832dc0b92aad6cf',
   'tiger-kidnapping-telecommunications':'9a757b0a89c05681015d35577149cdcd63784625f92719e5a81ea587a5818914',
   'executive-assistant-lu1-compatibility':'a4a95393fc137092eafcc4a9e1f61f3beea3bc00d6221a4e9e40cf65848ec43b'
  });
 });
});

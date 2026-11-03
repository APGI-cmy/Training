import {describe,it,expect} from 'vitest';
import {recoveryDrillCheck,recoveryDrillEvidence} from '@/server/security-watchdog/recovery-evidence';
describe('dated recovery exercise evidence',()=>{
 it('counts an executed current exercise while making its limits explicit',()=>{const r=recoveryDrillCheck(null,Date.parse('2026-11-03T10:00:00Z'));expect(r.state).toBe('passed');expect(r.kind).toBe('manual');expect(r.detail).toContain('does not perform another full restore');expect(r.detail).toContain('Application cutover');expect(r.detail).toContain(recoveryDrillEvidence.receipts.storage);});
 it('never counts future or expired evidence as a pass',()=>{for(const date of ['2026-11-01T00:00:00Z','2026-12-04T00:00:00Z'])expect(recoveryDrillCheck(null,Date.parse(date)).state).toBe('not_tested');});
 it('omits platform counts and project identifiers from a company-scoped check',()=>{const r=recoveryDrillCheck('company',Date.parse('2026-11-03T10:00:00Z'));expect(r.detail).not.toContain('135 tables');expect(r.detail).not.toContain(recoveryDrillEvidence.target);expect(r.detail).toContain('shared database/file recovery');});
});

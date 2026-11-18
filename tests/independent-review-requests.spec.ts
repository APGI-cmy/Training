import {describe,it,expect} from 'vitest';
import {reviewEmails,reviewPack,REVIEW_KINDS,type ReviewRequest} from '@/lib/review-requests';
import {notificationTarget} from '@/lib/notifications';
import {readFileSync} from 'node:fs';
describe('Independent version-bound review requests',()=>{
 it('provides four separate review types',()=>expect(Object.keys(REVIEW_KINDS)).toEqual(['content','branding','commercials','policies']));
 it('deduplicates reviewer addresses and rejects malformed or oversized recipient lists',()=>{expect(reviewEmails('A@example.com; a@example.com\nb@example.com')).toEqual(['a@example.com','b@example.com']);for(const v of ['', 'broken',Array.from({length:51},(_,i)=>`${i}@example.com`).join(',')])expect(()=>reviewEmails(v)).toThrow();});
 it('copies exact selected versions with a human-signoff instruction',()=>{const r={title:'Policies',kind:'policies',snapshot:{items:[{id:'one',title:'Credit policy',version:'1.2/hash',body:'The controlled policy.'}]}} as ReviewRequest;const text=reviewPack(r);expect(text).toContain('1.2/hash');expect(text).toContain('The controlled policy.');expect(text).toContain('named human reviewer');});
 it('allows only the exact request destination through notification navigation',()=>{expect(notificationTarget('/review-requests/11111111-1111-4111-8111-111111111111')).toContain('/review-requests/');expect(notificationTarget('//evil.test/review-requests/test')).toBe('/notifications');});
 it('keeps database mutations service-only and audit records append-only',()=>{const sql=readFileSync('supabase/migrations/20261118140200_independent_review_requests.sql','utf8');expect(sql).toContain('from public,anon,authenticated');expect(sql).toContain('enable row level security');expect(sql).not.toMatch(/delete from public\.(course_review|v6_review)/i);expect(sql).toContain("v6_review_events");});
 it('does not let explicit invitations inherit automatic reminder completion rules',()=>{const s=readFileSync('src/server/services/course-reviews.ts','utf8');expect(s).not.toContain('(m.kind==="reminder"||m.kind==="invitation")');expect(s).toContain('m.kind==="invitation"&&(!person||!canWork(round)');});
});

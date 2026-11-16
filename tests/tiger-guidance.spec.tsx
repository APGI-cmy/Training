import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {notificationRound} from './fixtures/review-notification';
import {reviewGuidance} from '@/lib/review-guidance';
import {reviewFeedbackReport} from '@/lib/review-feedback-report';
import {ReviewGuidance} from '@/components/reviews/ReviewGuidance';
import {notificationEmail,type NotificationMail} from '@/lib/notification-email';
function fixture(){const r=notificationRound();r.document.reviewProcessVersion=3;r.document.units.push({slug:'lu2',title:'Unit two'});r.document.findings=[{id:'f1',unit:'lu1',scope:'course',reference:'All branding',category:'branding',outcome:'issue',blocking:true,author:'reviewer@example.com',userId:'reviewer',at:'2026-10-02',text:'Wrong logo <script>x</script>',status:'open',replies:[]},{id:'f2',unit:'lu2',reference:'Quiz',category:'quiz',outcome:'satisfied',blocking:false,author:'johan.ras@apginc.ca',userId:'johan',at:'2026-10-03',text:'Satisfied',status:'closed',replies:[]}];return r;}
describe('One saved-data guidance model',()=>{
 it('orders actual submissions and counts a course-wide issue once, not once per LU',()=>{const r=fixture(),before=JSON.stringify(r),g=reviewGuidance(r,'johan.ras@apginc.ca','johan');expect(g.people[0].email).toBe('reviewer@example.com');expect(g.issues).toHaveLength(1);expect(g.people.find(p=>p.email==='jorrie.jordaan@apginc.ca')?.first).toBeUndefined();expect(g.actions[0].href).toContain('#finding-f1');expect(g.actions[0].text).toContain('reviewer@example.com');expect(JSON.stringify(r)).toBe(before);});
 it('reuses scoped findings for each LU and does not count declarations as issues',()=>{const r=fixture();expect(reviewGuidance(r,'reviewer@example.com','reviewer','lu2').issues).toHaveLength(1);expect(reviewGuidance(r,'reviewer@example.com','reviewer','lu2').findings).toHaveLength(2);});
 it('renders direct actions and explicit outstanding status without private schedules',()=>{const html=renderToStaticMarkup(<ReviewGuidance round={fixture()} email="johan.ras@apginc.ca" userId="johan"/>);expect(html).toContain('Go to this implementation response');expect(html).toContain('data-complete="false"');expect(html).toContain('/report');expect(html).not.toContain('PRIVATE PRINCIPAL SCHEDULE');});
 it('exports saved evidence with safe escaping and excludes private commercials',()=>{const r=fixture(),before=JSON.stringify(r),html=reviewFeedbackReport(r,'johan.ras@apginc.ca','johan');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).not.toContain('PRIVATE NOTES');expect(html).not.toContain('PRIVATE PRINCIPAL SCHEDULE');expect(JSON.stringify(r)).toBe(before);});
});
const job:NotificationMail={id:'mail',claimToken:'claim',notificationId:'notice',revision:1,email:'reviewer@example.com',message:'Johan implemented this <fix>',requirement:'Check LU1 and endorse the correction.',path:'/course-reviews/round#finding-f1',action:true,sender:'johan.ras@apginc.ca',sourceId:'round'};
describe('Action-specific notification emails',()=>{
 it('repeats the action and links to the actual finding',()=>{const mail=notificationEmail(job,new URL('https://training-platform-v2-staging.vercel.app'));expect(mail.text).toContain('You are required to do this: Check LU1');expect(mail.text).toContain('/course-reviews/round#finding-f1');expect(mail.html).toContain('&lt;fix&gt;');});
 it('does not demand an action for informational updates or allow external destinations',()=>{const mail=notificationEmail({...job,action:false,path:'//evil.example/test'},new URL('https://training-platform-v2-staging.vercel.app'));expect(mail.text).not.toContain('You are required');expect(mail.text).not.toContain('evil.example');expect(mail.text).toContain('/notifications');});
});

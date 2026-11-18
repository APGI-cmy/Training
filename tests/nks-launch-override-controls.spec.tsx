import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';
vi.mock('@/components/reviews/ReviewForms',()=>({ReviewForm:({children,hidden,label}:{children:ReactNode;hidden:Record<string,string>;label:string})=><form>{Object.entries(hidden).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}{children}<button>{label}</button></form>}));
import {ReviewPublicationOverride} from '@/components/reviews/ReviewPublicationOverride';
import {ReviewOverrideControl} from '@/components/reviews/ReviewOverrideControl';
import {notificationRound} from './fixtures/review-notification';
describe('Publication override controls',()=>{
 it('provides both buttons, a closed native modal and mandatory reason and confirmation',()=>{
  const html=renderToStaticMarkup(<ReviewPublicationOverride id="round" revision={141} fingerprint="hash" brandRevision={7}/>);
  expect(html).toContain('Override and discard review');expect(html).toContain('Override but retain review process');
  expect(html).toContain('Are you sure you want to override the review process?');expect(html).toMatch(/<dialog[^>]*aria-labelledby/);expect(html).not.toMatch(/<dialog[^>]*\sopen/);
  expect(html).toMatch(/<textarea[^>]*name="reason"[^>]*required/);expect(html).toContain('minLength="15"');expect(html).toMatch(/<input(?=[^>]*name="confirm_override")(?=[^>]*required)[^>]*>/);
  expect(html).toContain('name="scope" value="all"');expect(html).toContain('name="expected_revision" value="141"');expect(html).toContain('<option value="retain" selected="">');
 });
 it('does not expose override submission or reactivation forms to ordinary reviewers',()=>{
  const round=notificationRound();const html=renderToStaticMarkup(<ReviewOverrideControl round={round} scope="content" principal={false} brandRevision={1}/>);
  expect(html).not.toContain('<form');expect(html).not.toContain('Save review override');
 });
});

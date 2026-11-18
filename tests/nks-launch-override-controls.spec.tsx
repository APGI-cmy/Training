import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';
vi.mock('@/components/reviews/ReviewForms',()=>({ReviewForm:({children,hidden,label}:{children:ReactNode;hidden:Record<string,string>;label:string})=><form>{Object.entries(hidden).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}{children}<button>{label}</button></form>}));
import {ReviewPublicationOverride} from '@/components/reviews/ReviewPublicationOverride';
import {ReviewOverrideControl} from '@/components/reviews/ReviewOverrideControl';
import {notificationRound} from './fixtures/review-notification';
import {publishedTrainingRelease,publishedReviewOverride} from '@/lib/review-publication-state';

function released(){
 const round=notificationRound(),at='2026-11-18T09:43:29Z',version=round.document.workflow!.commercials.at(-1)!.id;
 round.document.reviewProcessVersion=3;
 round.document.reviewOverrides=(['content','commercials','branding'] as const).map(scope=>({id:scope,scope,mode:'retain',fingerprint:round.fingerprint,brandRevision:1,commercialVersion:version,reason:'Urgent prepaid client training; retain all outstanding reviews.',actorId:'johan',email:'johan.ras@apginc.ca',at}));
 round.document.trainingReleases=[{id:'published-release',at:'2026-11-18T09:48:56Z',fingerprint:round.fingerprint,brandRevision:1,commercialVersion:version}];
 return round;
}
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
 it.each(['content','commercials','branding'] as const)('shows the published status and saved reason in the %s block',scope=>{
  const round=released(),before=JSON.stringify(round),html=renderToStaticMarkup(<ReviewOverrideControl round={round} scope={scope} principal brandRevision={1}/>);
  expect(html).toContain('This course was published on');expect(html).toContain('Publication reason:');expect(html).toContain('Urgent prepaid client training; retain all outstanding reviews.');
  expect(html).toContain('The review process was retained. Please complete your review steps below.');expect(html).toContain('Go to review steps');
  expect(html).not.toContain('Continue to publish');expect(html).not.toContain('publication is permitted');
  expect(html).toContain('<details data-override-management="true">');expect(html).not.toMatch(/<details(?=[^>]*data-override-management)[^>]*\sopen/);
  expect(JSON.stringify(round)).toBe(before);
 });
 it.each([['content','review-process'],['commercials','commercial-preparation'],['branding','branding-review']] as const)('links %s to its retained review tasks', (scope,anchor)=>{
  const round=released(),html=renderToStaticMarkup(<ReviewOverrideControl round={round} scope={scope} principal brandRevision={1}/>);
  expect(html).toContain(`href="/course-reviews/${round.id}#${anchor}"`);
 });
 it('does not rewrite the published reason with a later saved override',()=>{
  const round=released();round.document.reviewOverrides!.push({...round.document.reviewOverrides![0],id:'later',reason:'Future publication reason only',at:'2026-11-18T10:00:00Z'});
  const release=publishedTrainingRelease(round,'hash',1)!;
  expect(publishedReviewOverride(round,'content',release)?.reason).toContain('Urgent prepaid client training');
  expect(renderToStaticMarkup(<ReviewOverrideControl round={round} scope="content" principal brandRevision={1}/>)).not.toContain('Future publication reason only');
 });
 it('preserves the published reason if an override is reactivated after publication',()=>{
  const round=released(),grant=round.document.reviewOverrides![0];round.document.reviewOverrides!.push({...grant,id:'revocation',mode:'revoke',revokes:grant.id,at:'2026-11-18T10:00:00Z'});
  expect(publishedReviewOverride(round,'content',publishedTrainingRelease(round,'hash',1)!)?.id).toBe(grant.id);
 });
 it('keeps a frozen published snapshot read-only and points retained work to its source',()=>{
  const round=released();round.status='published';round.document.sourceReviewId='source-review';round.created_at='2026-11-18T09:48:56Z';
  const html=renderToStaticMarkup(<ReviewOverrideControl round={round} scope="content" principal brandRevision={1}/>);
  expect(html).toContain('href="/course-reviews/source-review#review-process"');expect(html).not.toContain('<form');expect(html).not.toContain('Continue to publish');
 });
 it('describes a clear-mode publication without pretending a retained review is required',()=>{
  const round=released();round.document.reviewOverrides!.forEach(o=>{o.mode='clear';});
  const html=renderToStaticMarkup(<ReviewOverrideControl round={round} scope="content" principal brandRevision={1}/>);
  expect(html).toContain('This review was closed by the recorded override.');expect(html).not.toContain('Please complete your review steps below');
 });
 it('retains the pre-publication route for a saved override that has not been published',()=>{
  const round=released();round.document.trainingReleases=[];
  const html=renderToStaticMarkup(<ReviewOverrideControl round={round} scope="content" principal brandRevision={1}/>);
  expect(html).toContain('Continue to publish');expect(html).not.toContain('This course was published on');
 });
 it('requires an explicit new publication for changed content, branding or commercial terms',()=>{
  const round=released();expect(publishedTrainingRelease(round,'hash',1)?.id).toBe('published-release');
  expect(publishedTrainingRelease(round,'changed',1)).toBeUndefined();expect(publishedTrainingRelease(round,'hash',2)).toBeUndefined();
  round.document.workflow!.commercials.at(-1)!.id='new-commercial-version';expect(publishedTrainingRelease(round,'hash',1)).toBeUndefined();
 });
});

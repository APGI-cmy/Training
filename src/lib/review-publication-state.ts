import type {ReviewRound} from './course-review';
import {reviewOverride,type ReviewScope} from './review-overrides';
export type TrainingRelease=NonNullable<ReviewRound['document']['trainingReleases']>[number];

// An existing learner release is distinct from an open review. Changed content,
// branding or commercial terms still need a new explicit publication decision.
export function publishedTrainingRelease(round:ReviewRound,fingerprint:string,brandRevision:number):TrainingRelease|undefined{
 if(round.status==='published')return {id:round.id,at:round.created_at,fingerprint:round.fingerprint,brandRevision:round.document.brand.revision,commercialVersion:round.document.workflow?.commercials.at(-1)?.id??null};
 const release=round.document.trainingReleases?.at(-1);
 return release?.fingerprint===fingerprint&&release.brandRevision===brandRevision&&release.commercialVersion===(round.document.workflow?.commercials.at(-1)?.id??null)?release:undefined;
}

// Show the reason that existed when the release was published. A later override
// or reactivation must not rewrite the historical publication explanation.
export function publishedReviewOverride(round:ReviewRound,scope:ReviewScope,release:TrainingRelease){
 const overrides=(round.document.reviewOverrides??[]).filter(o=>Date.parse(o.at)<=Date.parse(release.at));
 const saved=overrides.filter(o=>o.scope===scope&&o.mode!=='revoke').at(-1);
 return reviewOverride({...round.document,reviewOverrides:overrides},scope,release.fingerprint,round.status==='published'&&saved?saved.brandRevision:release.brandRevision);
}

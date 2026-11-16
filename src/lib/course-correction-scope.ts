import scopes from "@/data/course-correction-scopes.json";
import type {ReviewRound} from "./course-review";
import {deliveryIdentityForCourse,changedDeploymentUnits} from './course-deployment';

// Coverage may carry forward only for an explicitly verified content transition.
// No unit selection or exemption is accepted from browser form fields.
export function correctionRecheckUnits(round:ReviewRound,fingerprint:string,units:{slug:string}[]=round.document.units):string[]{
 const current=deliveryIdentityForCourse(round.course_id);
 if(current?.fingerprint===fingerprint&&round.document.contentIdentity)return changedDeploymentUnits(round,current);
 const scope=scopes.find(s=>s.roundId===round.id&&s.courseId===round.course_id&&s.previousFingerprint===round.fingerprint&&s.fingerprint===fingerprint);
 return scope?[...scope.changedUnits]:units.map(u=>u.slug);
}
export function assertApprovedCorrectionScope(round:ReviewRound,fingerprint:string){
 const approved=scopes.find(s=>s.roundId===round.id&&s.courseId===round.course_id&&s.previousFingerprint===round.fingerprint);
 if(approved&&approved.fingerprint!==fingerprint)throw Error("The deployed content differs from the approved correction scope. Verify the new changes before registering; saved coverage has not been reset.");
}

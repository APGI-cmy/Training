import type {ReviewRound,ReviewFinding} from "./course-review";
import {findingPhase} from './lu-review-workflow';

export type ContentRevision = {fingerprint:string;previousFingerprint:string;at:string;email:string;userId:string|null;notes:string;deployment:string;changedUnits?:string[];preservedUnits?:string[];automatic?:boolean;deploymentId?:string};

export function fixFinding(round:ReviewRound,finding:ReviewFinding,userId:string,at:string) {
 if(finding.outcome==="satisfied"||(finding.status!=="open"&&!(finding.status==="fixed"&&finding.fixedFingerprint!==round.fingerprint)))throw Error("Only an open issue can be marked implemented.");
 finding.status="fixed";finding.fixedBy=userId;finding.fixedFingerprint=round.fingerprint;finding.fixedAt=at;
 delete finding.verifiedBy;delete finding.verifiedFingerprint;delete finding.verifiedAt;
}

export function verifyFinding(round:ReviewRound,finding:ReviewFinding,userId:string,at:string) {
 if(finding.status!=="fixed"||finding.fixedBy===userId||!finding.fixedBy)throw Error("A different reviewer must verify a finding marked fixed.");
 if(finding.fixedFingerprint!==round.fingerprint)throw Error("Record the implemented fix against the current deployed version before verifying it.");
 finding.status="closed";finding.verifiedBy=userId;finding.verifiedFingerprint=round.fingerprint;finding.verifiedAt=at;
}

export function correctionBlockers(round:ReviewRound) {
 if(!round.document.contentRevisions?.length)return [];
 if(round.document.reviewProcessVersion===3)return round.document.findings.some(f=>!f.supersededBy&&f.blocking&&findingPhase(round,f)!=='Closed')?['Blocking corrections require a submitted implementation response and the applicable explicit or deemed endorsement.']:[];
 return round.document.findings.filter(f=>!f.supersededBy).some(f=>f.blocking&&(f.status!=="closed"||f.fixedFingerprint!==round.fingerprint||f.verifiedFingerprint!==round.fingerprint||!f.fixedBy||!f.verifiedBy||f.fixedBy===f.verifiedBy))
  ?["Blocking corrections require implementation and independent verification against this deployed version."]:[];
}

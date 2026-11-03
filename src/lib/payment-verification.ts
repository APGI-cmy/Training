export type PaymentVerification={
 checkedAt:string;
 passed:number;
 total:number;
 checks:{title:string;state:'passed'|'failed'|'inconclusive'}[];
 liveAcceptance:'not_tested';
};

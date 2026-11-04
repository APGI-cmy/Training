import {canWork,type ReviewRound} from "./course-review";
import {hasReviewTask} from "./review-tasks";
import {moneyCents,percentageBps} from "./commercial-planning";
export function jointPlatformCourse(configuration:Record<string,string|null>){return configuration.agreement_scope==='apgi_course'||configuration.ownership_model==='apgi_permanent'&&Number(configuration.apgi_share)===100&&Number(configuration.platform_user_share??'0')===0;}
export function canProposeCommercial(round:ReviewRound,email:string,principal:boolean){
 const v=round.document.workflow?.commercials.at(-1),p=round.document.participants.find(p=>p.email===email);
 return !!v&&canWork(round)&&(principal||!!p&&p.state!=="declined"&&hasReviewTask(p,"commercials")&&!!v.offeredAt);
}
export function readCommercialSuggestion(form:FormData,configuration?:Record<string,string|null>){
 const comment=String(form.get("comment")??"").trim();
 if(comment.length<5||comment.length>5000)throw Error("Explain the proposed change in 5 to 5000 characters.");
 const price=String(form.get("proposal_price")??"").trim()||undefined;
 const apgiShare=String(form.get("proposal_apgi_share")??"").trim()||undefined;
 const recoveryRate=String(form.get("proposal_recovery_rate")??"").trim()||undefined;
 if(price!==undefined)moneyCents(price,"suggested learner fee");
 if(apgiShare!==undefined)percentageBps(apgiShare,"suggested APGI share");
 if(apgiShare!==undefined&&configuration&&jointPlatformCourse(configuration))throw Error('This APGI-owned course has no editable external platform-user allocation here. Internal shareholding can only change through an approved policy amendment.');
 if(recoveryRate!==undefined)percentageBps(recoveryRate,"suggested recovery percentage");
 return {comment,...(price!==undefined?{price}:{}),...(apgiShare!==undefined?{apgiShare}:{}),...(recoveryRate!==undefined?{recoveryRate}:{})};
}

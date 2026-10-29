import {LUReviewWorkspace} from "./LUReviewWorkspace";
import {cleanReviewComplete,luWorkflowBlockers} from "@/lib/lu-review-workflow";
import {CleanReviewStatus} from './LUReviewStatus';
import {correctionRecheckUnits} from "@/lib/course-correction-scope";
import Link from "next/link";
import {activeFindings,canWork,currentReport,findingLocationLabel,type ReviewRound} from "@/lib/course-review";
import {hasReviewTask} from "@/lib/review-tasks";
import {reportAnchor} from "@/lib/review-navigation";
import {SummaryText} from "@/components/shared/SummaryText";
import {FindingUpdateForm} from "./FindingUpdateForm";
import {ReviewForm} from "./ReviewForms";

// Keep import/version metadata and frozen report snapshots in storage, outside the working view.
export function workingReviewText(text:string){
 return text.split(/\n\nFindings at submission:\s*\n/)[0]
  .replace(/^Carried from review [0-9a-f-]+:\s*\n?/gim,"")
  .replace(/^(?:reply|fixed|close) · version [^:]+:\s*/i,"").trim();
}
const Comment=({label,defaultValue}:{label:string;defaultValue?:string})=><label>{label} (optional explanation)<textarea name="comment" maxLength={5000} defaultValue={defaultValue}/></label>;

function LegacyReviewProcess({round,email,userId,requester,fresh}:{round:ReviewRound;email:string;userId:string;requester:boolean;fresh:boolean}){
 const d=round.document,base=`/course-reviews/${round.id}`,findings=activeFindings(d),person=d.participants.find(p=>p.email===email);
 const editable=canWork(round)&&fresh&&!!person&&person.state!=="declined"&&hasReviewTask(person,"content");
 const primary=d.participants.filter(p=>p.role==="primary"&&p.state!=="declined"&&hasReviewTask(p,"content"));
 const submitted=primary.filter(p=>p.state==="finished"&&currentReport(d,p.email)).length;
 const endorsed=primary.filter(p=>{const r=currentReport(d,p.email);return p.state==="finished"&&r&&!r.endorsements.some(e=>e.decision==="changes")&&r.endorsements.some(e=>e.decision==="approve"&&e.userId!==r.userId&&d.participants.some(p=>p.email===e.email&&p.state!=="declined"&&hasReviewTask(p,"content")));}).length;
 const missing=d.units.filter(u=>!person?.coverage.includes(u.slug));
 const previousReport=d.reports.filter(r=>r.email===email).at(-1);
 const people=[...d.participants.filter(p=>hasReviewTask(p,"content")||findings.some(f=>f.author===p.email)),
  ...[...new Set(findings.map(f=>f.author))].filter(author=>!d.participants.some(p=>p.email===author)).map(author=>({email:author,coverage:[] as string[],role:"earlier",state:"earlier"}))
 ].sort((a,b)=>Number(b.email===email)-Number(a.email===email));
 return <section className="review-box review-process" id="review-process" aria-labelledby="review-process-heading">
  <h2 id="review-process-heading">Review process</h2>
  <p>{requester?"Requester view — follow each reviewer’s progress, address findings and arrange independent checks.":"Reviewer view — open a learning unit, record or update feedback, then submit your report and check another reviewer’s report."}</p>
  <div id="review-process-notifications" aria-label="Your review notifications"/>
  <ul className="summary-totals" aria-label="Review progress summary"><li>{submitted}/{primary.length} reports submitted</li><li>{endorsed}/{primary.length} independently endorsed</li><li>{findings.filter(f=>f.outcome!=="satisfied").length} findings</li><li>{findings.filter(f=>f.outcome==="satisfied").length} nothing-to-add reviews</li><li>{findings.filter(f=>f.blocking&&f.status!=="closed").length} unresolved publication blockers</li></ul>
  {!fresh?<p className="form-error">You can open every LU and read saved feedback. Saving feedback and review decisions is paused until Johan or Jorrie <a href="#changes-implemented">registers the changed course version</a>.</p>:!canWork(round)?<p>Review submissions are paused. <a href="#manage-request">Check the review deadline or request an extension</a>.</p>:null}
  <nav className="review-process-unit-links" aria-label="Open learning units for review">{d.units.map(u=><Link key={u.slug} href={`${base}/units/${u.slug}?feedback=1`}>{u.title} — open review</Link>)}</nav>
  <div id="review-summary" className="review-process-next"><h3>Your next step</h3>
   {person&&hasReviewTask(person,"content")?<>
    {person.role==="primary"?<>
     {person.state==="finished"?<><p>Your content report is submitted. You can return to any LU to add or edit feedback. Further feedback starts a new report version requiring fresh endorsement.</p>{editable?<ReviewForm id={round.id} operation="reopen_report" label="Start a new version of my report"/>:null}</>:<><p>{missing.length?`${missing.length} learning units still need your coverage confirmation. Open a unit above to review it and save feedback.`:"Your unit coverage is complete. Check the findings below and submit your report."}</p>{editable?<ReviewForm id={round.id} operation="report" acknowledge label="Submit my completed content review and email the team" disabled={missing.length>0}><label>Overall review conclusion<select name="report_conclusion" required defaultValue=""><option value="" disabled>Choose your conclusion</option><option value="findings_recorded">Review completed — findings and suggestions recorded below</option><option value="no_issues">Review completed — no issues found</option></select></label><Comment label="Overall review" defaultValue={previousReport?workingReviewText(previousReport.text).split("Reviewer explanation:\n")[1]:undefined}/><label><input name="confirm_review" type="checkbox" required disabled={missing.length>0}/> I confirm this report records my completed review. Unresolved findings still require correction before publication.</label><p>All LU and quiz coverage must be confirmed. A different reviewer must endorse this report.</p></ReviewForm>:null}</>}
    </>:<p>Read a submitted report below and record your independent decision.</p>}
    {editable&&person.role==="peer"&&person.state!=="finished"?<ReviewForm id={round.id} operation="finish_peer" label="Finish my peer-check task"><p>Record at least one report decision first.</p></ReviewForm>:null}
   </>:<p>Follow the team’s findings and report decisions below.</p>}
   {requester&&person?.state==="finished"?<p><a href="#commercial-preparation">Continue to commercial preparation</a></p>:null}
  </div>
  <div id="shared-findings"><span id="my-full-review" className="review-process-anchor"/>
   {people.map(p=>{const own=p.email===email,report=currentReport(d,p.email),earlier=d.reports.filter(r=>r.email===p.email).at(-1),saved=findings.filter(f=>f.author===p.email);
    return <details className="review-process-person" key={p.email} open={requester||own}>
     <summary>{p.email}{own?" (you)":""} · {p.state==="earlier"?"Earlier reviewer":`${p.coverage.length}/${d.units.length} LUs · ${p.state==="finished"&&report?"Report submitted":p.state==="declined"?"Declined":"Review in progress"}`} · {saved.length} saved responses</summary>
     <div id={report?reportAnchor(report.id):earlier?reportAnchor(earlier.id):undefined} className="review-process-report"><h3>Report and independent check</h3>
      {report?<><p><strong>{p.state==="finished"?"Report submitted":"Report reopened — new submission required"}</strong></p><SummaryText text={workingReviewText(report.text)}/>{!report.endorsements.length?<p>Independent endorsement outstanding.</p>:report.endorsements.map(e=><div key={e.userId}><strong>{e.email}: {e.decision==="approve"?"Endorsed report":"Revised report requested"}</strong><SummaryText text={workingReviewText(e.text)}/></div>)}
       {editable&&report.userId!==userId&&!report.endorsements.some(e=>e.userId===userId)?<ReviewForm id={round.id} operation="endorse" hidden={{report_id:report.id}} label="Commit my peer decision"><label>Report decision<select name="decision"><option value="approve">Endorse this submitted report</option><option value="changes">Request a revised report</option></select></label><Comment label="Peer decision"/><p>This checks the submitted report. It does not close unresolved findings or approve publication.</p></ReviewForm>:null}
      </>:earlier?<><p>Earlier submitted report retained. Complete the changed-unit rechecks, then submit an updated report for this version. Earlier endorsements remain saved with the earlier report.</p><SummaryText text={workingReviewText(earlier.text)}/></>:<p>{p.role==="primary"?"Full report outstanding.":p.role==="earlier"?"Saved feedback retained from an earlier reviewer.":"Peer checker — a full report is not required."}</p>}
     </div>
     {!saved.length?<p>No saved feedback from this reviewer yet. <Link href={`${base}/units/${d.units[0]?.slug??"introduction"}?feedback=1`}>Open the course review</Link>.</p>:saved.map(f=><article id={`finding-${f.id}`} className="review-process-finding" key={f.id}>
      <h3>{findingLocationLabel(f)} · {f.reference}</h3>
      <p><strong>{f.outcome==="satisfied"?"Nothing to add":f.status==="fixed"?"Implemented — independent verification required":f.status==="closed"?"Closed":"Change requested"}</strong>{f.blocking?" · Blocks publication until verified":""} · {f.category}</p>
      <SummaryText text={workingReviewText(f.text)}/>
      <p className="review-actions"><Link className="secondary-button" href={`${base}/units/${f.unit}?${own?`finding=${f.id}`:"feedback=1"}`}>{own?"Open LU / edit my feedback":"Open LU to review this finding"}</Link>{f.attachment?<a href={`${base}/evidence/${f.id}`} target="_blank" rel="noreferrer">View screenshot</a>:null}</p>
      {f.replies.length||editable&&f.outcome!=="satisfied"?<details open={f.status!=="closed"}><summary>Discussion and finding update</summary>{f.replies.map((r,i)=><div className="review-process-message" key={i}><strong>{r.email}</strong><SummaryText text={workingReviewText(r.text)}/></div>)}{editable&&f.outcome!=="satisfied"?<FindingUpdateForm id={round.id} findingId={f.id} canFix={f.status==="open"||f.status==="fixed"&&f.fixedFingerprint!==round.fingerprint} canVerify={f.status==="fixed"&&f.fixedFingerprint===round.fingerprint&&f.fixedBy!==userId}/>:null}</details>:null}
     </article>)}
    </details>;
   })}
  </div>
 </section>;
}

export function ReviewProcess(props:{round:ReviewRound;email:string;userId:string;requester:boolean;fresh:boolean;deployedFingerprint?:string}){
 const {round,email,userId,fresh}=props,d=round.document;
 if(d.reviewProcessVersion!==3)return <LegacyReviewProcess {...props}/>;
 // Whitelist the content-workflow snapshot. Private commercial schedules never enter client props.
 const snapshot:ReviewRound={id:round.id,plan_id:null,organisation_id:round.organisation_id,course_id:round.course_id,fingerprint:round.fingerprint,revision:round.revision,status:round.status,created_at:round.created_at,document:{title:d.title,brand:d.brand,requester:d.requester,requesterId:d.requesterId,designerEmail:d.designerEmail,reviewProcessVersion:3,cutoff:d.cutoff,units:d.units,participants:d.participants,findings:d.findings,reports:[],events:[],terms:{text:"",partner:false,acceptor:""},...(d.workflow?{workflow:{version:2,stage:d.workflow.stage,designerName:d.workflow.designerName,designerCompany:d.workflow.designerCompany,ownerId:d.workflow.ownerId,partner:d.workflow.partner,partnerEmail:"",commercials:[],counterOffers:0}}:{})}};
 // Only registered version scopes are needed in the working view; release notes and
 // deployment references remain in the requester-controlled registration history.
 snapshot.document.contentRevisions=d.contentRevisions?.map(r=>({fingerprint:r.fingerprint,previousFingerprint:r.previousFingerprint,at:r.at,email:'',userId:'',notes:'',deployment:'',changedUnits:r.changedUnits,preservedUnits:r.preservedUnits}));
 const pending=luWorkflowBlockers(round);
 return <section className="review-box review-process" id="review-process" aria-labelledby="review-process-heading"><h2 id="review-process-heading">Review process</h2><p>One workspace per LU. New findings and feedback saved beside the presentation appear here. Submitted designer responses and reviewer decisions update the same record.</p><span id="review-units"/><span id="review-summary"/><span id="shared-findings"/><span id="my-full-review"/>
 {d.reports.map(r=><span key={r.id} id={reportAnchor(r.id)} className="review-process-anchor"/>)}
 <div id="review-process-notifications"><Link href="/notifications">Open notifications and tracking</Link></div>
 {fresh&&cleanReviewComplete(round)?<CleanReviewStatus course/>:null}
 <p>{pending.length?"Open a learning unit to see its initial review, implementation feedback, reopened rounds and endorsements.":"All LU reviews and required finding endorsements are complete. Final course, commercial and branding approvals remain separate."}</p>
 <LUReviewWorkspace round={snapshot} email={email} userId={userId} fresh={fresh} pendingRecheckUnits={fresh?[]:correctionRecheckUnits(round,props.deployedFingerprint??'')}/>
 </section>;
}

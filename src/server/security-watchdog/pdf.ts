import 'server-only';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {stateLabel,type WatchdogPayload,type WatchdogProof} from '@/lib/security-watchdog';
import {watchdogScore} from '@/lib/watchdog-overview';
export async function watchdogPdf(payload:WatchdogPayload,proof:WatchdogProof,freshness:string){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const width=595.28,height=841.89,margin=48,ink=rgb(.07,.18,.28),teal=rgb(.08,.38,.44),grey=rgb(.35,.42,.48);
 let page=pdf.addPage([width,height]),y=height-50;
 const clean=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[–—]/g,'-').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[^\x20-\x7e\n]/g,'?');
 function newPage(){page=pdf.addPage([width,height]);y=height-50;}
 function line(text:string,size=10,weight=false,color=ink){if(y<65)newPage();page.drawText(clean(text),{x:margin,y,size,font:weight?bold:font,color});y-=size+5;}
 function paragraph(text:string,size=10,weight=false){
  const f=weight?bold:font,max=width-margin*2;let pending='';
  for(const word of clean(text).split(/\s+/)){
   if(f.widthOfTextAtSize(word,size)>max){if(pending){line(pending,size,weight);pending='';}let segment='';for(const char of word){if(f.widthOfTextAtSize(segment+char,size)>max){line(segment,size,weight);segment='';}segment+=char;}pending=segment;continue;}
   if(pending&&f.widthOfTextAtSize(pending+' '+word,size)>max){line(pending,size,weight);pending=word;}else pending+=(pending?' ':'')+word;
  }
  if(pending)line(pending,size,weight);y-=5;
 }
 function heading(text:string){if(y<115)newPage();y-=10;line(text,13,true,teal);y-=3;}
 line('APGI SECURITY WATCHDOG',19,true);line('Point-in-time technical assurance report',11,false,grey);y-=10;
 paragraph('Scope: '+payload.scope.label,12,true);paragraph('Result: '+payload.assurance.replaceAll('_',' ')+' | Evidence '+freshness,11,true);
 const score=watchdogScore(payload.checks);
 paragraph(`${score.percent}% of named checks passed (${score.passed}/${score.total})`,13,true);
 page.drawRectangle({x:margin,y:y-10,width:width-margin*2,height:9,color:rgb(.86,.9,.92)});
 page.drawRectangle({x:margin,y:y-10,width:(width-margin*2)*score.percent/100,height:9,color:rgb(.12,.55,.37)});y-=28;
 paragraph(`${score.findings} findings | ${score.gaps} gaps / not tested. This is test-suite evidence, not a percentage guarantee of security.`,9);
 paragraph('Trigger: '+(payload.trigger??'manual'),9);
 paragraph('Finished: '+new Date(payload.finishedAt).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})+' SAST / '+payload.finishedAt+' UTC');
 paragraph('This report covers the named checks. It does not prove that information has never leaked and does not certify ISO compliance. Untested or inconclusive controls remain gaps.');
 heading('Run identity');paragraph('Report '+payload.runId);paragraph('Application '+payload.application+' | '+payload.environment+' | Suite '+payload.suite);paragraph('Deployment '+payload.deployment);paragraph('Source '+payload.commit);paragraph('Temporary fixture cleanup: '+(payload.cleanup?'completed':'follow-up required'));
 heading('Technical checks and actions');
 for(const c of payload.checks){if(y<115)newPage();paragraph(stateLabel(c.state).toUpperCase()+' - '+c.title,11,true);paragraph(c.detail);if(c.action)paragraph('Action: '+c.action);}
 heading('Scope and limitations');for(const note of payload.limitations)paragraph('- '+note);
 heading('Management evidence references');
 if(!payload.manualEvidence.length)paragraph('No management evidence references were recorded for this scope when the test ran.');
 for(const e of payload.manualEvidence){paragraph(e.controlId+' - '+e.disposition,10,true);paragraph(e.reference);paragraph('Recorded '+e.recordedAt+' | Review by '+e.expiresAt,9);}
 paragraph('Administrator statements are self-reported. They do not mark technical tests passed or replace independent assessment.');
 heading('Report integrity');paragraph('Stored report signature verified against the platform signing key at export. The PDF is a human-readable rendering; use the signed JSON for cryptographic verification.');paragraph('SHA-256 '+proof.digest,9);paragraph('Ed25519 key '+proof.keyId,9);paragraph('Trusted public key: https://training-platform-v2-staging.vercel.app/api/security-watchdog/keys',9);paragraph('Independent evidence anchoring and formal certification are separate controls.',9);
 const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:margin,y:43},end:{x:width-margin,y:43},thickness:.5,color:rgb(.7,.78,.82)});p.drawText('APGI Watchdog | '+payload.runId.slice(0,8)+' | '+(i+1)+' / '+pages.length,{x:margin,y:27,size:8,font,color:grey});});
 pdf.setTitle('Security Watchdog - '+payload.scope.label);pdf.setAuthor('APGI Training');pdf.setSubject('Scoped technical evidence; not ISO certification');
 return pdf.save();
}

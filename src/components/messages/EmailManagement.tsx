'use client';
import {startTransition,useActionState,type FormEvent} from 'react';
import {mailManagementAction} from '@/server/actions/mail-management';
import {mailCategories,mailDeliveryLabel,invitationProgress,type ManagedMail,type MailActionState} from '@/lib/mail-tracking';
function date(value:string|null){return value?new Date(value).toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'})+' SAST':'—';}
export function EmailManagementRow({mail}:{mail:ManagedMail}){
 const [state,action,pending]=useActionState(mailManagementAction,{} as MailActionState);
 // Preserve native follow-up selections after a successful Server Action.
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const data=new FormData(event.currentTarget),button=(event.nativeEvent as SubmitEvent).submitter;
  if(button instanceof HTMLButtonElement&&button.name)data.set(button.name,button.value);
  startTransition(()=>action(data));
 }
 const invitation=['admin_invitation','company_invitation'].includes(mail.category),security=['account_confirmation','account_recovery'].includes(mail.category);
 const inactive=invitation&&(!!mail.accepted_at||mail.invitation_status==='revoked'||!!mail.expires_at&&Date.parse(mail.expires_at)<=Date.now());
 const blocked=['bounced','suppressed','complained'].includes(mail.provider_event??'');
 return <tr>
  <td><strong>{mail.recipient}</strong><br/><small>{mail.company??'APGI platform'}</small><br/><small>{date(mail.created_at)}</small></td>
  <td><strong>{mail.subject}</strong><br/><small>{mailCategories[mail.category]}</small>{mail.source_href?<p><a href={mail.source_href}>Open related record</a></p>:null}</td>
  <td><strong>{mailDeliveryLabel(mail)}</strong><br/><small>{mail.attempted_at?date(mail.attempted_at):'No sending attempt recorded'}</small><br/><small>{mail.attempts} sending attempt{mail.attempts===1?'':'s'}</small>{mail.error?<p className="mail-warning">{mail.error}</p>:null}{mail.checked_at?<small>Provider checked: {date(mail.checked_at)}</small>:null}</td>
  <td>{mail.opened_at||mail.provider_event==='opened'||mail.provider_event==='clicked'?<><strong>Open / click reported</strong><br/><small>{mail.opened_at?date(mail.opened_at):'Exact opening time not supplied'}</small></>:<small>No open reported</small>}{mail.clicked_at?<p>Link click: {date(mail.clicked_at)}</p>:null}<small className="mail-hint">Email privacy tools and automated scanners can affect these events.</small></td>
  <td>{invitation?<><strong>{invitationProgress(mail)}</strong>{mail.accepted_at?<p>{date(mail.accepted_at)}</p>:null}{mail.expires_at&&!mail.accepted_at?<small className="mail-hint">Invitation expires {date(mail.expires_at)}</small>:null}</>:mail.category==='support'?<>{mail.platform_read_at?'Read in platform':'No platform read yet'}{mail.platform_read_at?<small className="mail-hint">{date(mail.platform_read_at)}</small>:null}</>:<small>Opening this email does not record approval or completion. Use the related record.</small>}</td>
  <td><strong>{({open:'Needs follow-up',waiting:'Waiting for response',done:'Follow-up complete'})[mail.followup_state]}</strong>{mail.followup_due?<p>Due: {new Date(mail.followup_due).toLocaleDateString('en-ZA',{timeZone:'Africa/Johannesburg'})}</p>:null}{mail.followup_note?<p className="mail-note">{mail.followup_note}</p>:null}
   <details><summary>Manage follow-up</summary><form onSubmit={submit}><input type="hidden" name="id" value={mail.id}/><input type="hidden" name="operation" value="followup"/><label>Status<select name="state" defaultValue={mail.followup_state}><option value="open">Needs follow-up</option><option value="waiting">Waiting for response</option><option value="done">Follow-up complete</option></select></label><label>Follow-up date<input type="date" name="due" defaultValue={mail.followup_due?.slice(0,10)??''}/></label><label>Notes (optional)<textarea name="note" maxLength={2000} defaultValue={mail.followup_note}/></label><button disabled={pending}>Save follow-up</button></form></details>
  </td>
  <td><form onSubmit={submit} className="mail-row-actions"><input type="hidden" name="id" value={mail.id}/><button name="operation" value="detail" disabled={pending}>View history</button><button name="operation" value="check" disabled={pending||!mail.provider_id}>Refresh status</button><button name="operation" value="resend" disabled={pending||inactive||blocked||mail.category==='payment'}>{security?'Send fresh sign-in help':'Resend email'}</button></form>
   {inactive?<small>This invitation is already accepted, revoked or expired.</small>:blocked?<small>Resolve the delivery block before resending.</small>:mail.category==='payment'?<small>Send a fresh request from the private payment setup process.</small>:invitation?<small>A resend replaces the old invitation link.</small>:null}
   {pending?<p role="status">Working…</p>:null}{state.error?<p className="message-error" role="alert">{state.error}</p>:null}{state.success?<p className="message-success" role="status">{state.success}</p>:null}
   {state.detail?<details open><summary>Email history</summary>{state.detail.attempts.map(a=><div className="mail-history" key={a.id}><strong>{date(a.at)} · {mailDeliveryLabel({state:a.state,provider_event:null})}</strong>{a.provider_id?<small className="mail-hint">Provider reference: {a.provider_id}</small>:null}{a.error?<p>{a.error}</p>:null}{a.body?<details><summary>Message text</summary><p className="mail-note">{a.body}</p></details>:null}</div>)}{state.detail.events.map((e,i)=><p key={i}>{date(e.at)} · {e.kind.replaceAll('_',' ')}</p>)}{state.detail.followups.map((e,i)=><p key={i}>{date(e.at)} · {e.action.replaceAll('_',' ').replace('followup:','Follow-up: ')}</p>)}</details>:null}
  </td>
 </tr>;
}

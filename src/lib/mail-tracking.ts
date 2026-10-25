export const mailCategories={admin_invitation:'Administrator invitation',company_invitation:'Company invitation',account_recovery:'Account and password help',account_confirmation:'Account confirmation',email_set:'Email message set',support:'Support notification',policy:'Policy review',payment:'Payment setup request',system:'Platform email'} as const;
export type ManagedMail={id:string;organisation_id:string|null;company:string|null;category:keyof typeof mailCategories;recipient:string;subject:string;created_at:string;source_id:string|null;followup_state:'open'|'waiting'|'done';followup_note:string;followup_due:string|null;state:string|null;provider_id:string|null;attempted_at:string|null;error:string|null;checked_at:string|null;attempts:number;delivered_at:string|null;opened_at:string|null;clicked_at:string|null;provider_event:string|null;accepted_at:string|null;invitation_status:string|null;expires_at:string|null;platform_read_at:string|null;source_href:string|null};
export type MailWorkspace={total:number;messages:ManagedMail[];companies:{id:string;name:string}[]};
export type MailDetail={attempts:{id:string;at:string;state:string;provider_id:string|null;error:string|null;body:string|null}[];events:{kind:string;at:string;provider_id:string}[];followups:{action:string;at:string}[]};
export type MailActionState={error?:string;success?:string;detail?:MailDetail};
export function mailDeliveryLabel(mail:Pick<ManagedMail,'state'|'provider_event'>){
 const labels:Record<string,string>={suppressed:'Suppressed',complained:'Reported as spam',bounced:'Bounced',failed:'Delivery failed',clicked:'Link click reported',opened:'Open reported',delivered:'Delivered to mail server',delivery_delayed:'Delivery delayed',sent:'Accepted by provider'};
 return labels[mail.provider_event??'']??({accepted:'Accepted by provider',failed:'Sending failed',sending:'Sending — awaiting confirmation',unknown:'Delivery not confirmed',queued:'Queued',skipped:'Not sent'}[mail.state??'']??'Not sent');
}
export function invitationProgress(mail:Pick<ManagedMail,'category'|'accepted_at'|'invitation_status'|'expires_at'>,now=Date.now()){
 if(!['admin_invitation','company_invitation'].includes(mail.category))return 'Not applicable';
 if(mail.accepted_at)return 'Accepted / activated';
 if(mail.invitation_status==='revoked')return 'Revoked';
 if(mail.expires_at&&Date.parse(mail.expires_at)<=now)return 'Expired';
 return 'Awaiting signup and profile';
}

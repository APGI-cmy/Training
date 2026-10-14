"use client";
import { useActionState } from 'react';
import { resendInvitation } from '@/server/actions/invitations/resend-invitation';
import type { CreateInvitationState } from '@/server/actions/invitations/create-invitation';
export function InvitationDeliveryControl({invitationId,status}:{invitationId:string;status:string}){
  const [state,action,pending]=useActionState(resendInvitation,{ok:false} as CreateInvitationState);
  return <form action={action}><input type="hidden" name="invitationId" value={invitationId}/><button className="secondary-button" disabled={pending}>{pending?'Sending…':status==='sent'?'Resend email':'Send invitation email'}</button>{state.error?<p role="alert">{state.error==='WAIT_ONE_MINUTE_BEFORE_RESENDING'?'Please wait one minute before sending again.':`Email could not be sent: ${state.error}`}</p>:null}{state.ok?<p role="status">{state.deliveryStatus==='sent'?'Invitation accepted by the email provider. Check Inbox and Junk.':'Email is disabled; use this test link:'}{state.invitationUrl?<a href={state.invitationUrl}>Open test invitation</a>:null}</p>:null}</form>;
}

export type ReviewInvitationEmailState={organisation_id:string;course_id:string;status:'ready'|'blocked'|'standard';name?:string;id?:string;revision?:number;reason?:string};
export const reviewEmailEditor=(state:ReviewInvitationEmailState)=>`/messages/email-sets?company=${encodeURIComponent(state.organisation_id)}${state.id?`&email=${encodeURIComponent(state.id)}`:''}`;

import 'server-only';

// A held production invitation stays pending and contains only a token hash.
// Sending it later rotates the token through the existing audited resend action.
export function productionInvitationEmailsHeld(){
 return process.env.ALP_ENVIRONMENT==='training-production'&&process.env.ALP_EMAIL_MODE==='disabled';
}

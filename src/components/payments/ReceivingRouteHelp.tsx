export function ReceivingRouteHelp({alternative=false}:{alternative?:boolean}){
 return <aside aria-label="Receiving account requirements">
  {alternative?<p><strong>Receiving route awaiting APGI review.</strong> Your country request is saved. The current Canadian Stripe Connect integration does not offer self-service payouts to this destination. Repeating setup cannot enable this route.</p>:null}
  <p>South African recipients need a separately approved payout arrangement. Jorrie must ask Stripe about an approved route or APGI must integrate an alternative provider before bank onboarding can start. Choose the country where your account is actually registered.</p>
  <p>V2 is a sandbox: this request does not collect bank details, move money or confirm that funds are held. Do not send bank or card details in messages.</p>
  <p><a href="https://docs.stripe.com/connect/connect-cross-border-payouts" target="_blank" rel="noreferrer">Stripe country and cross-border requirements</a></p>
 </aside>;
}

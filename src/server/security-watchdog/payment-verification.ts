import 'server-only';
import {paymentProbes} from './payment-probes';
import {assuranceAccess} from './assurance';
import {claimSecurityBudget} from '@/server/security/auth-budget';
import {paymentAudit} from '@/server/services/stripe-platform';
import {WatchdogError} from './access';
import type {PaymentVerification} from '@/lib/payment-verification';

// These are bounded local exercises of deployed validators. Never create a
// Stripe account, charge, test identity, email or customer-data query here.
export async function verifyPaymentProtection(scope?:string):Promise<PaymentVerification>{
 const {session}=await assuranceAccess(scope);
 const actor=session.user.id;
 // Actor-wide counters cannot be bypassed by selecting another owned company.
 if(!await claimSecurityBudget('payment-check-minute:'+actor,1,60)||
    !await claimSecurityBudget('payment-check-hour:'+actor,10,3600))
  throw new WatchdogError('Please wait one minute between checks. Up to ten fresh checks are available per hour.',429);
 const checks:PaymentVerification['checks']=[];
 await paymentProbes(async(_id,title,_kind,_detail,test)=>{
  let state:PaymentVerification['checks'][number]['state']='inconclusive';
  try{state=await test()?'passed':'failed';}catch{/* Do not expose configuration or cryptographic errors. */}
  checks.push({title,state});return state==='passed';
 });
 const passed=checks.filter(c=>c.state==='passed').length;
 // Audit is mandatory; it stores counts, not synthetic values or credentials.
 await paymentAudit(actor,`payment_security_check:${passed}/${checks.length}`);
 return {checkedAt:new Date().toISOString(),passed,total:checks.length,checks,liveAcceptance:'not_tested'};
}

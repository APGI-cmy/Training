import {monthlyLearnerCents} from '@/lib/course-selection';
import {moneyLabel} from '@/lib/pricing-structures';
import {FieldHelp} from '@/components/admin/FieldHelp';
export function MonthlyPrice({total,learners,months,currency,platform}:{total:number;learners:number;months:number;currency:string;platform?:number}){
 return <p className="pricing-monthly"><strong>{moneyLabel(monthlyLearnerCents(total,learners,months),currency)} per learner per month</strong> <FieldHelp label="Monthly comparison" text="Total quoted price before tax divided by the actual learner count and access months. Includes content, platform service and any buyer-paid processing provision. Rounded for display only. This is an equivalent comparison rate, not a monthly payment plan or a change to the upfront total."/><small>Equivalent comparison rate · upfront payment</small>{platform!==undefined?<small>Platform service only: {moneyLabel(monthlyLearnerCents(platform,learners,months),currency)} per learner/month</small>:null}</p>;
}

import type {PurchaseRoute} from '@/lib/course-calculator';
import type {PricingStructure} from '@/lib/pricing-structures';
import {costServices} from '@/lib/service-costs';
import {partnerCourseShares,retainerLabel,type PartnerRetainer} from '@/lib/partner-commercial-terms';
import {CommercialPriceCards} from '@/components/payments/CommercialPriceCards';

export function PartnerCommercialSummary({structure,quantities,company,retainer}:{structure:PricingStructure;quantities:Record<PurchaseRoute,number>;company:string;retainer?:PartnerRetainer}){
 const shares=partnerCourseShares(structure);
 const platformServices=costServices.filter(s=>['vercel','render','supabase','resend'].includes(s.id));
 return <>
  <CommercialPriceCards structure={structure} quantities={quantities}/>
  <section className="review-box"><h3>What platform costs cover</h3><ul>{platformServices.map(s=><li key={s.id}>{s.name}</li>)}</ul></section>
  <section className="review-box"><h3>Course revenue share</h3>
   {shares.map(({apgi,partner,courses})=><div key={`${apgi}:${partner}`}>
    {shares.length>1?<p>{[...courses].join(' · ')}</p>:null}
    <dl><dt>APGI · platform owner</dt><dd>{apgi}%</dd><dt>{company} · platform partner</dt><dd>{partner}%</dd></dl>
   </div>)}
   {retainer?<p><strong>Retaining fee</strong> · {retainerLabel(retainer)}</p>:null}
  </section>
 </>;
}

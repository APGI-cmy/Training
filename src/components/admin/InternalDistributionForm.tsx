import {StructureForm} from './StructureForm';
import {saveCommercialDraft} from '@/server/actions/platform-policies';
import {platformJointOwnership,platformPartnershipDefaults,internalCostAllocationTerms} from '@/lib/platform-partnership';
export function InternalDistributionForm({defaults}:{defaults?:Record<string,string|null>}){
 return <StructureForm action={saveCommercialDraft} label="Save internal distribution draft"><input type="hidden" name="kind" value="internal_distribution"/><input type="hidden" name="internal_model_version" value="2"/>
 <p>{platformJointOwnership}</p><p>These settings divide the combined APGI platform income between APGI and SRMS. They are separate from any course-owner/platform split and any reciprocal sales arrangement.</p>
 <label>Title<input name="title" defaultValue="APGI / SRMS equal partnership and profit distribution" required minLength={3} maxLength={150}/></label>
 <label>Currency<input name="currency" defaultValue={defaults?.currency??'USD'} required/></label>
 <label>APGI residual profit share (%)<input name="apgi_share" inputMode="decimal" defaultValue={defaults?.apgi_share??defaults?.jorrie_share??platformPartnershipDefaults.apgiShare} required/></label>
 <label>SRMS residual profit share (%)<input name="srms_share" inputMode="decimal" defaultValue={defaults?.srms_share??defaults?.johan_share??platformPartnershipDefaults.srmsShare} required/></label>
 <p>Standard residual profit distribution: APGI 50% / SRMS 50%. Changing a draft profit percentage does not change the partners’ equal ownership interests.</p>
 <p>{internalCostAllocationTerms}</p>
 <dl><div><dt>Stripe processing cost responsibility</dt><dd>APGI</dd></div><div><dt>Other operating cost responsibility</dt><dd>SRMS</dd></div><div><dt>Development cost responsibility</dt><dd>SRMS</dd></div></dl>
 <label className="admin-span-two">Notes and any proposed exception<textarea name="notes" rows={3} maxLength={5000}/></label>
 </StructureForm>;
}

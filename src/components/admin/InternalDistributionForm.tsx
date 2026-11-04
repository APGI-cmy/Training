import {StructureForm} from './StructureForm';
import {saveCommercialDraft} from '@/server/actions/platform-policies';
import {platformJointOwnership,platformPartnershipDefaults,internalCostAllocationTerms,platformOperatingGovernance,fixedInternalIncomeRule} from '@/lib/platform-partnership';
export function InternalDistributionForm({defaults}:{defaults?:Record<string,string|null>}){
 return <StructureForm action={saveCommercialDraft} label="Save internal distribution draft"><input type="hidden" name="kind" value="internal_distribution"/><input type="hidden" name="internal_model_version" value="2"/>
 <p>{platformJointOwnership}</p><p>These settings divide the combined APGI platform income between APGI and SRMS. They are separate from any course-owner/platform split and any reciprocal sales arrangement.</p>
 <label>Title<input name="title" defaultValue="APGI / SRMS equal partnership and profit distribution" required minLength={3} maxLength={150}/></label>
 <label>Currency<input name="currency" defaultValue={defaults?.currency??'USD'} required/></label>
 <p>{platformOperatingGovernance}</p>
 <label>APGI — represented by Jorrie — fixed income share (%)<input name="apgi_share" value={platformPartnershipDefaults.apgiShare} readOnly aria-readonly="true"/></label>
 <label>SRMS — represented by Johan — fixed income share (%)<input name="srms_share" value={platformPartnershipDefaults.srmsShare} readOnly aria-readonly="true"/></label>
 <p>{fixedInternalIncomeRule}</p>
 <p>{internalCostAllocationTerms}</p>
 <dl><div><dt>Stripe processing cost responsibility</dt><dd>APGI</dd></div><div><dt>Other operating cost responsibility</dt><dd>SRMS</dd></div><div><dt>Development cost responsibility</dt><dd>SRMS</dd></div></dl>
 <label className="admin-span-two">Administrative notes (do not change the policy split)<textarea name="notes" rows={3} maxLength={5000}/></label>
 </StructureForm>;
}

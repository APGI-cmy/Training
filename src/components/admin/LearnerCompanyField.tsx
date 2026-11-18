import type {LearnerCompany} from '@/server/services/learner-companies';
export function LearnerCompanyField({companies,organisationId,listId,name='company',required=false}:{companies:LearnerCompany[];organisationId?:string;listId:string;name?:string;required?:boolean}){
 const choices=companies.filter(c=>!organisationId||c.organisation_id===organisationId);
 return <label><span>Learner’s company</span><input name={name} list={listId} maxLength={120} required={required} placeholder="Select or type a company, e.g. Econet" autoComplete="off"/><datalist id={listId}>{choices.map(c=><option key={c.id} value={c.name}/>)}</datalist><small>Select a saved name or type a new one. This is the learner’s employer, not a new platform partner.</small></label>;
}

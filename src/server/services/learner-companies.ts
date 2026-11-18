import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {productionCompanyId} from './tenant-courses';
import {validId} from '@/lib/company-structure';

// Employers are reporting labels owned by a training company. They are never
// platform organisations, memberships, administrators or publishing brands.
export type LearnerCompany={id:string;organisation_id:string;name:string};
export function learnerCompanyName(value:string){
 const name=value.trim().replace(/\s+/g,' ');
 if(name.length>120||/[\x00-\x1f]/.test(name))throw Error('Enter a company name of up to 120 characters.');
 return name;
}
export function assertLearnerCompanyScope(organisationId:string){
 validId(organisationId);const tenant=productionCompanyId();
 if(tenant&&organisationId!==tenant)throw Error('Choose this training company.');
}
export async function getLearnerCompanies():Promise<LearnerCompany[]>{
 const tenant=productionCompanyId();
 const r=await adminRest(`/rest/v1/learner_companies?select=id,organisation_id,name&order=name.asc${tenant?`&organisation_id=eq.${tenant}`:''}`);
 if(!r.ok)throw Error('Learner company names could not be loaded.');
 return r.json();
}
export async function rememberLearnerCompany(organisationId:string,value:string,actorId:string){
 assertLearnerCompanyScope(organisationId);const name=learnerCompanyName(value);if(!name)return null;
 const r=await adminRest('/rest/v1/learner_companies?on_conflict=organisation_id,name_key',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({organisation_id:organisationId,name,created_by:actorId})});
 if(!r.ok)throw Error('The learner company name could not be saved.');
 const inserted: LearnerCompany[] = await r.json();if(inserted[0])return inserted[0];
 const previous=await adminRest(`/rest/v1/learner_companies?organisation_id=eq.${organisationId}&name_key=eq.${encodeURIComponent(name.toLowerCase())}&select=id,organisation_id,name&limit=1`);
 const saved=previous.ok?(await previous.json())[0]:null;
 if(!saved)throw Error('The learner company name could not be verified.');
 return saved as LearnerCompany;
}

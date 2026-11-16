'use client';
import {continuingSalesClause,reciprocalScopeClause,routineMaintenanceTerms} from '@/lib/platform-partnership';
export function OngoingSalesFields({courseId,clientName,ownershipModel,courses,ids,conditions,onChange}:{courseId:string;clientName:string;ownershipModel:string;courses:{slug:string;title:string;shareable?:boolean}[];ids:string;conditions:string;onChange:(key:string,value:string)=>void}){
 let selected:string[]=[];try{const raw=JSON.parse(ids);if(Array.isArray(raw)&&raw.every(v=>typeof v==='string'))selected=raw;}catch{}
 const allowed=courses.filter(c=>c.slug!==courseId&&c.shareable===true);
 return <fieldset className="notice-card"><legend>Continuing hosting, sales and reciprocal course access</legend><input type="hidden" name="continuing_sales_rights" value="yes"/>
 <p>{continuingSalesClause(clientName||'the named client',ownershipModel==='partner_paid',ownershipModel==='apgi_permanent')}</p><p>The course owner must accept these proposed permissions as part of the exact commercial agreement.</p>
 <p>{reciprocalScopeClause}</p><p>Select the other courses proposed for this partner. An empty list grants no reciprocal course access.</p>
 <input type="hidden" name="reciprocal_course_ids" value={JSON.stringify(selected)}/>
 {allowed.length?allowed.map(c=><label key={c.slug}><input type="checkbox" checked={selected.includes(c.slug)} onChange={e=>onChange('reciprocal_course_ids',JSON.stringify(e.target.checked?[...selected,c.slug]:selected.filter(id=>id!==c.slug)))}/>{c.title}</label>):<p>No unrestricted other courses are available for selection.</p>}
 <label>Additional hosting and sales conditions<textarea name="continuing_sales_conditions" value={conditions} onChange={e=>onChange('continuing_sales_conditions',e.target.value)} maxLength={1500} rows={3}/></label>
 <p>{routineMaintenanceTerms}</p></fieldset>;
}

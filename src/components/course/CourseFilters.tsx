'use client';
import {useId} from 'react';
import {FieldHelp} from '@/components/admin/FieldHelp';
import {SCOPE_NAMES,type CourseFilter,type CourseClassification} from '@/lib/course-selection';
import type {CourseScope} from '@/lib/course-calculator';

export function CourseFilters({courses,value,onChange}:{courses:CourseClassification[];value:CourseFilter;onChange:(value:CourseFilter)=>void}){
 const id=useId(),industries=[...new Set(courses.filter(c=>c.scope==='industry').map(c=>c.industry||'Industry not recorded'))].sort(),clients=[...new Set(courses.filter(c=>c.scope==='client').map(c=>c.clientName||'Client not recorded'))].sort();
 return <fieldset className="course-filter-panel"><legend>Find and group courses <FieldHelp label="Course filters" text="Tick any combination of categories. The results combine those categories; industry and client choices narrow their respective category. Filtering never adds course access or changes a price. Untick all categories to show every eligible course."/></legend>
  <div className="course-filter-categories">{(Object.keys(SCOPE_NAMES) as CourseScope[]).map(scope=><label key={scope}><input type="checkbox" checked={value.scopes.includes(scope)} onChange={e=>onChange({...value,scopes:e.target.checked?[...value.scopes,scope]:value.scopes.filter(s=>s!==scope)})}/>{SCOPE_NAMES[scope]}</label>)}</div>
  <div className="pricing-fields"><label>Search courses<input type="search" value={value.search} onChange={e=>onChange({...value,search:e.target.value})} placeholder="Course title, industry or client"/></label>
  {value.scopes.includes('industry')?<label><span>Industry <FieldHelp label="Industry" text="Choose an industry recorded with a course. This filters industry-specific courses while retaining any other ticked categories. Missing labels are listed as Industry not recorded."/></span><select value={value.industry} onChange={e=>onChange({...value,industry:e.target.value})}><option value="">All recorded industries</option>{industries.map(n=><option key={n}>{n}</option>)}</select></label>:null}
  {value.scopes.includes('client')?<label><span>Client <FieldHelp label="Client" text="Choose or type a recorded client name. To add a new client to a course, use Course industry and client details below. A filter does not reassign ownership, create a partner company, or grant access."/></span><input list={`${id}-clients`} value={value.clientName} onChange={e=>onChange({...value,clientName:e.target.value})} placeholder="Choose or type a client name"/><datalist id={`${id}-clients`}>{clients.map(n=><option key={n} value={n}/>)}</datalist></label>:null}</div>
  <button type="button" className="secondary-button" onClick={()=>onChange({scopes:[],industry:'',clientName:'',search:''})}>Clear filters</button>
 </fieldset>;
}

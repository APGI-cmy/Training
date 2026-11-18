'use client';
import {useActionState,useState} from 'react';
import {createGroupWithState} from '@/server/actions/groups';
import {LearnerCompanyField} from './LearnerCompanyField';
import type {LearnerCompany} from '@/server/services/learner-companies';
export function LearnerGroupForm({organisations,companies}:{organisations:{id:string;name:string}[];companies:LearnerCompany[]}){
 const [state,action,pending]=useActionState(createGroupWithState,{});
 const [organisation,setOrganisation]=useState(organisations[0]?.id??'');
 return <form action={action} className="admin-form-grid"><label>Training provider<select name="organisationId" required value={organisation} onChange={e=>setOrganisation(e.target.value)}>{organisations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><LearnerCompanyField companies={companies} organisationId={organisation} listId="group-learner-companies"/><label>Group name<input name="name" maxLength={100} placeholder="e.g. Econet November cohort"/><small>Leave blank to use the learner’s company name.</small></label><button className="secondary-button" disabled={pending}>{pending?'Saving…':'Save group'}</button>{state.error?<p role="alert">{state.error}</p>:null}{state.success?<p role="status">{state.success}</p>:null}</form>;
}

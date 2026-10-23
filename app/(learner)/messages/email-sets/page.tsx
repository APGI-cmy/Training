import {notFound} from 'next/navigation';
import {emailSetWorkspace} from '@/server/services/email-sets';
import {EmailWorkbench} from '@/components/messages/EmailWorkbench';
import {getCourses} from '@/lib/courses';
import '../messages.css';
import './workbench.css';
export const dynamic='force-dynamic';
export default async function EmailSetsPage({searchParams}:{searchParams:Promise<{company?:string;email?:string}>}){const {workspace}=await emailSetWorkspace(),query=await searchParams;if(!workspace.companies.length)notFound();return <EmailWorkbench workspace={workspace} initialCompany={query.company} initialEmail={query.email} courses={getCourses().map(c=>({id:c.id,title:c.title}))}/>;}

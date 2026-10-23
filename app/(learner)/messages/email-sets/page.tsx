import {notFound} from 'next/navigation';
import {emailSetWorkspace} from '@/server/services/email-sets';
import {EmailWorkbench} from '@/components/messages/EmailWorkbench';
import {getCourses} from '@/lib/courses';
import '../messages.css';
import './workbench.css';
export const dynamic='force-dynamic';
export default async function EmailSetsPage(){const {workspace}=await emailSetWorkspace();if(!workspace.companies.length)notFound();return <EmailWorkbench workspace={workspace} courses={getCourses().map(c=>({id:c.id,title:c.title}))}/>;}

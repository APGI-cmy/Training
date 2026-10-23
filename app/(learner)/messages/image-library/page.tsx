import {notFound} from 'next/navigation';
import {emailSetWorkspace} from '@/server/services/email-sets';
import {CompanyImageLibrary} from '@/components/messages/EmailMediaLibrary';
import {getCourses} from '@/lib/courses';
import '../messages.css';
import '../email-sets/workbench.css';
export const dynamic='force-dynamic';
export default async function ImageLibraryPage(){const {workspace}=await emailSetWorkspace();if(!workspace.companies.length)notFound();return <CompanyImageLibrary workspace={workspace} courses={getCourses().map(c=>({id:c.id,title:c.title}))}/>;}

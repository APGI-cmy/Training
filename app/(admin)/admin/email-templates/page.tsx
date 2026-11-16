import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/auth/require-admin';
export default async function EmailPreviews(){await requireAdmin();redirect('/messages/email-sets');}

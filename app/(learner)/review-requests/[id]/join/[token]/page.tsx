import Link from 'next/link';
import {independentReviewJoin} from '@/server/services/review-requests';
import {StructureForm} from '@/components/admin/StructureForm';
import {registerIndependentReviewer} from '@/server/actions/review-requests';
export const dynamic='force-dynamic';
export default async function JoinReview({params}:{params:Promise<{id:string;token:string}>}){
 const {id,token}=await params;let invite;try{invite=await independentReviewJoin(id,token);}catch{invite=null;}
 return <main className="admin-page"><h1>Join the review request</h1>{invite?<><h2>{invite.title}</h2><p>Use the invited email address. This request grants access only to its selected review documents.</p><Link className="primary-button" href={`/alp-sign-in?next=${encodeURIComponent('/review-requests/'+id)}`}>I have an account — sign in</Link><StructureForm action={registerIndependentReviewer} label="Create my review account"><input type="hidden" name="id" value={id}/><input type="hidden" name="token" value={token}/><label>Invited email<input readOnly value={invite.email}/></label><label>New private password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required/></label></StructureForm></>:<p>This invitation is closed, expired or has been replaced. Ask the requester to reopen or resend it.</p>}</main>;
}

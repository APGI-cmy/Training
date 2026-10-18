import Link from "next/link";
import {reviewJoinInvitation} from "@/server/services/course-review-registration";
import {ReviewRegistration} from "@/components/reviews/ReviewRegistration";
import "../../../reviews.css";
export const dynamic="force-dynamic";
export default async function JoinReview({params}:{params:Promise<{id:string;token:string}>}){
 const {id,token}=await params,invite=await reviewJoinInvitation(id,token);
 return <main className="review-page"><h1>Join the course review team</h1>{invite?<><h2>{invite.title}</h2><p>Create a separate V2 account with the invited email. If you already use V2, sign in instead. Review access is limited to the assigned course and team.</p><Link className="secondary-button" href={`/alp-sign-in?next=${encodeURIComponent(`/course-reviews/${id}`)}`}>I already have a V2 account — sign in</Link><ReviewRegistration id={id} token={token} email={invite.email}/></>:<p>This review invitation has expired or is unavailable. Ask the requester to extend the review or send a new invitation.</p>}</main>;
}

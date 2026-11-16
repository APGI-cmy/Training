"use server";
import {reviewJoinInvitation} from "@/server/services/course-review-registration";
import {adminRest} from "@/server/supabase/admin-rest";
import {claimAuthEmailBudget} from "@/server/services/auth-email-budget";
import {sendAccountConfirmationEmail} from "@/server/services/email/send-account-confirmation";
import type {ReviewActionState} from "./course-reviews";
export async function registerCourseReviewer(_:ReviewActionState,form:FormData):Promise<ReviewActionState>{
 try{
  const id=String(form.get("round_id")??""),token=String(form.get("token")??""),password=String(form.get("password")??"");
  const invite=await reviewJoinInvitation(id,token);if(!invite)throw Error("This review invitation is unavailable. Ask the requester for an active invitation.");
  if(password.length<12||password.length>256)throw Error("Choose a password of at least 12 characters.");
  if(!(await claimAuthEmailBudget("signup",invite.email)))throw Error("Wait before requesting another confirmation. Sign in if your V2 account already exists.");
  const r=await adminRest("/auth/v1/admin/generate_link",{method:"POST",body:JSON.stringify({type:"signup",email:invite.email,password})});
  if(!r.ok)throw Error("If you already have a V2 account, sign in or use Forgot password. Otherwise contact the requester.");
  const body=await r.json() as {hashed_token?:string};
  if(!body.hashed_token||!await sendAccountConfirmationEmail(invite.email,body.hashed_token))throw Error("Confirmation could not be sent. Contact the requester or use Forgot password if your account now exists.");
  return {success:"Check your confirmation email. Confirm your email and complete Profile, then return to your review invitation or choose Course reviews. No learner enrolment or administrator rights are granted."};
 }catch(e){return {error:e instanceof Error?e.message:"Registration unavailable."};}
}

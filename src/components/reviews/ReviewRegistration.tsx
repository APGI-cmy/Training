"use client";
import {useActionState} from "react";
import {registerCourseReviewer} from "@/server/actions/course-review-registration";
import type {ReviewActionState} from "@/server/actions/course-reviews";
export function ReviewRegistration({id,token,email}:{id:string;token:string;email:string}){
 const [state,action,pending]=useActionState<ReviewActionState,FormData>(registerCourseReviewer,{});
 return <form className="review-form" action={action}><input type="hidden" name="round_id" value={id}/><input type="hidden" name="token" value={token}/><label>Invited email<input value={email} readOnly autoComplete="email"/></label><label>Your new V2 password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required/></label><button className="primary-button" disabled={pending}>{pending?"Sending confirmation…":"Create review account"}</button>{state.error?<p role="alert" className="form-error">{state.error}</p>:null}{state.success?<p role="status" className="form-success">{state.success}</p>:null}</form>;
}

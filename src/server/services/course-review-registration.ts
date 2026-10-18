import "server-only";
import {createHash} from "node:crypto";
import {rows} from "./company-structure";
import {canWork,type ReviewRound} from "@/lib/course-review";
export async function reviewJoinInvitation(id:string,token:string){
 if(!/^[0-9a-f-]{36}$/i.test(id)||! /^[a-zA-Z0-9_-]{43}$/.test(token))return null;
 const hash=createHash("sha256").update(token).digest("hex");
 const invite=(await rows<{email:string;expires_at:string}>(`/rest/v1/course_review_join_tokens?token_hash=eq.${hash}&round_id=eq.${id}&select=email,expires_at&limit=1`))[0];
 const round=(await rows<ReviewRound>(`/rest/v1/course_review_rounds?id=eq.${id}&select=*&limit=1`))[0];
 if(!invite||!round||!canWork(round)||!round.document.participants.some(p=>p.email===invite.email&&p.state!=="declined"))return null;
 return {email:invite.email,title:round.document.title};
}

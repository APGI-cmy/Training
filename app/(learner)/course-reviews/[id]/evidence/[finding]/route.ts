import {requireReview} from "@/server/services/course-reviews";
import {adminRest} from "@/server/supabase/admin-rest";
export async function GET(request:Request,{params}:{params:Promise<{id:string;finding:string}>}){
 const {id,finding}=await params,{round}=await requireReview(id),record=round.document.findings.find(f=>f.id===finding);
 const version=new URL(request.url).searchParams.get("version");
 const attachment=version!==null&&/^\d+$/.test(version)?record?.previousVersions?.[Number(version)]?.attachment:record?.attachment;
 if(!attachment)return new Response("Not found",{status:404});
 const r=await adminRest(`/storage/v1/object/authenticated/course-review-evidence/${attachment}`);
 if(!r.ok)return new Response("Evidence unavailable",{status:404});
 return new Response(r.body,{headers:{"content-type":"image/png","cache-control":"private, no-store","x-content-type-options":"nosniff","content-disposition":"inline; filename=review-evidence.png"}});
}

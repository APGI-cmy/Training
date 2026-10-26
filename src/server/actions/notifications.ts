"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {adminRest} from "@/server/supabase/admin-rest";
import {notificationSession,notificationDestination} from "@/server/services/notifications";
import {notificationTarget} from "@/lib/notifications";
import {validId} from "@/lib/company-structure";
export type NotificationState={error?:string;success?:string};
export async function notificationAction(_previous:NotificationState,form:FormData):Promise<NotificationState>{
 try{
  const session=await notificationSession(),operation=String(form.get("operation")??"");
  if(!["open","read","acknowledge","all_read"].includes(operation))throw Error("Choose a valid notification response.");
  let target="/notifications";
  if(operation==="all_read"){
   const response=await adminRest(`/rest/v1/admin_notifications?recipient_user_id=eq.${session.user.id}&read_at=is.null`,{method:"PATCH",body:JSON.stringify({read_at:new Date().toISOString()})});
   if(!response.ok)throw Error("Notifications could not be marked as read.");
  }else{
   const id=validId(String(form.get("id")??""));
   const destination=operation==="open"?await notificationDestination(session,id):undefined;
   const response=await adminRest("/rest/v1/rpc/v2_notification_receipt",{method:"POST",body:JSON.stringify({p_user:session.user.id,p_id:id,p_mode:operation==="acknowledge"?"acknowledge":"read"})});
   if(!response.ok)throw Error("This notification is unavailable or requires a response in its workflow.");target=notificationTarget(await response.json());
   if(destination?.source_type==="review"){
    target=notificationTarget(destination.target_path);
    if(target.startsWith("/course-reviews/")){const [path,anchor]=target.split("#");target=`${path}?notification=${id}${anchor?`#${anchor}`:""}`;}
   }
  }
  revalidatePath("/","layout");if(operation==="open")redirect(target);
  return {success:operation==="acknowledge"?"Receipt acknowledged. No approval or agreement was recorded.":"Marked as read. Any required workflow response remains outstanding."};
 }catch(error){if(error instanceof Error&&"digest" in error)throw error;return {error:error instanceof Error?error.message:"The notification could not be updated."};}
}
export async function markNotificationRead(form:FormData){form.set("operation","read");return notificationAction({},form);}

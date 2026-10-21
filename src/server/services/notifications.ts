import "server-only";
import {cache} from "react";
import {adminRest} from "@/server/supabase/admin-rest";
import {requireSession,type AlpSession} from "@/server/auth/session";
import type {NotificationInbox} from "@/lib/notifications";
export async function notificationSession(){const session=await requireSession();if(!session.user.email_confirmed_at)throw Error("Confirm your email to use notifications.");return session;}
export const notificationInbox=cache(async(session:AlpSession,filter="all",offset=0,summary=false):Promise<NotificationInbox>=>{
 const response=await adminRest("/rest/v1/rpc/v2_notification_inbox",{method:"POST",body:JSON.stringify({p_user:session.user.id,p_filter:filter,p_offset:offset,p_summary:summary})});
 if(!response.ok)throw Error("Notifications are temporarily unavailable. Please try again.");return response.json();
});

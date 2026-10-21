import {getCurrentSession} from "@/server/auth/session";
import {notificationInbox} from "@/server/services/notifications";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
export async function GET(){
 const session=await getCurrentSession();
 if(!session)return Response.json({error:"Sign in to view notifications."},{status:401,headers});
 if(!session.user.email_confirmed_at)return Response.json({error:"Confirm your email first."},{status:403,headers});
 try{const {unread,responses,attention}=await notificationInbox(session,"all",0,true);return Response.json({unread,responses,attention},{headers});}
 catch{return Response.json({error:"Notifications are temporarily unavailable."},{status:503,headers});}
}

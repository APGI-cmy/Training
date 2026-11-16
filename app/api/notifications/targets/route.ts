import {getCurrentSession} from "@/server/auth/session";
import {notificationTargets} from "@/server/services/notifications";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
export async function GET(request:Request){
 const session=await getCurrentSession();
 if(!session)return Response.json({error:"Sign in to view notification references."},{status:401,headers});
 if(!session.user.email_confirmed_at)return Response.json({error:"Confirm your email."},{status:403,headers});
 const query=new URL(request.url).searchParams,path=query.get("path")??"",selected=query.get("notification");
 if(selected&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selected))return Response.json({error:"Invalid reference."},{status:400,headers});
 try{return Response.json({items:await notificationTargets(session,path,selected)},{headers});}
 catch{return Response.json({error:"Notification references are temporarily unavailable."},{status:503,headers});}
}

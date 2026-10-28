import {getCurrentSession} from '@/server/auth/session';
import {notificationSentMessages} from '@/server/services/notifications';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
export async function GET(request:Request){
 const session=await getCurrentSession();
 if(!session||!session.user.email_confirmed_at)return Response.json({error:'Sign in with your verified account.'},{status:401,headers});
 const q=new URL(request.url).searchParams,round=q.get('round'),unit=q.get('unit'),page=Number(q.get('page')??0);
 if(round&&!/^[a-f0-9-]{36}$/i.test(round)||unit&&!/^[a-z0-9_-]{1,100}$/i.test(unit)||!Number.isInteger(page)||page<0||page>200)return Response.json({error:'Invalid message filter.'},{status:400,headers});
 try{return Response.json(await notificationSentMessages(session,round,unit,page*50),{headers});}
 catch{return Response.json({error:'Your sent messages could not be loaded. Refresh to try again.'},{status:503,headers});}
}

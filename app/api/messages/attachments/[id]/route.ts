import {notificationSession} from "@/server/services/notifications";
import {messageRpc} from "@/server/services/messages";
import {validId} from "@/lib/company-structure";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const session=await notificationSession(),id=validId((await params).id),file=await messageRpc<{name:string;mime:string;data:string}|null>('v2_message_attachment',{p_actor:session.user.id,p_message:id});
 if(!file)return new Response('Attachment unavailable',{status:404});
 return new Response(new Uint8Array(Buffer.from(file.data,'base64')),{headers:{'content-type':file.mime,'content-disposition':`attachment; filename="${file.name.replace(/[^a-z0-9 ._()-]/gi,'_')}"`,'cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"}});
 }catch(error){if(error instanceof Error&&'digest' in error)throw error;return new Response('Attachment unavailable',{status:404});}
}

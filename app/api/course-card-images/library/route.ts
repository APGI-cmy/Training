import {courseCardImageWorkspace} from '@/server/services/course-card-images';
export async function GET(){
 try{return Response.json(await courseCardImageWorkspace(),{headers:{'Cache-Control':'private, no-store'}});}
 catch{return Response.json({error:'Sign in with your APGI principal account to change course images.'},{status:403});}
}

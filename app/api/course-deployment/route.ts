import {currentDeliveryStatus} from '@/server/services/course-deployments';
export const dynamic='force-dynamic';
export async function GET(){
 const status=currentDeliveryStatus();
 return Response.json(status??{error:'Deployment identity unavailable'},{status:status?200:503,headers:{'cache-control':'no-store'}});
}

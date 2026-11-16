import {getPublicCatalogue} from '@/server/services/public-course-catalogue';
export const dynamic='force-dynamic';
const headers={'Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=0, s-maxage=60','X-Content-Type-Options':'nosniff'};
export async function GET(){
 try{return Response.json(await getPublicCatalogue(),{headers});}
 catch{return Response.json({error:'Course catalogue temporarily unavailable.'},{status:503,headers:{...headers,'Cache-Control':'no-store'}});}
}

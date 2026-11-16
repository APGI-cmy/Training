import { requirePlatformPrincipal } from "@/server/services/platform-principals";
import { publishedExchangeQuotes } from "@/server/services/currency-rates";

export const maxDuration=20;
export async function GET(){
  const headers={"Cache-Control":"private, no-store"};
  try{await requirePlatformPrincipal();}catch{return Response.json({error:"Sign in with your platform principal account to refresh currency rates."},{status:403,headers});}
  try{return Response.json({quote:(await publishedExchangeQuotes())[0]},{headers});}
  catch{return Response.json({error:"The latest exchange rates could not be retrieved. Your inputs are retained. Please retry."},{status:503,headers});}
}

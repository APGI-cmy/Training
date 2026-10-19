import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ACTIVITY_COOKIE, IDLE_TIMEOUT_MS } from "@/lib/session-activity";
import { getCurrentSession, signOut } from "@/server/auth/session";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({error:"Same-origin activity required."},{status:403});
  const session = await getCurrentSession();
  if (!session) { await signOut(); return NextResponse.json({authenticated:false},{status:401,headers:{"Cache-Control":"no-store"}}); }
  const body = await request.json().catch(()=>({}));
  const store = await cookies();
  if (body.active === true) {
    const options = {httpOnly:true,sameSite:"lax" as const,secure:process.env.NODE_ENV==="production",path:"/",maxAge:28800};
    for (const name of ["alp_access_token","alp_refresh_token","alp_user_id"]) { const value=store.get(name)?.value; if(value) store.set(name,value,options); }
    store.set(ACTIVITY_COOKIE,String(Date.now()),options);
  }
  return NextResponse.json({authenticated:true,idleTimeoutMs:IDLE_TIMEOUT_MS,lastActivity:Number(store.get(ACTIVITY_COOKIE)?.value)||Date.now()},{headers:{"Cache-Control":"no-store"}});
}

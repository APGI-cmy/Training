import { NextRequest, NextResponse } from "next/server";

import { ACTIVITY_COOKIE, sessionIsIdle, tokenNeedsRefresh } from "@/lib/session-activity";

import { assertStagingIsolation } from "@/server/environment-isolation";

const names = ["alp_access_token", "alp_refresh_token", "alp_user_id", ACTIVITY_COOKIE];

export async function proxy(request: NextRequest) {

  const changed = new Map<string,string>();

  const access = request.cookies.get(names[0])?.value, refresh = request.cookies.get(names[1])?.value;

  const activity = request.cookies.get(ACTIVITY_COOKIE)?.value;

  function finish(clear = false) {

    if (clear) names.forEach(name => request.cookies.delete(name));

    else changed.forEach((value,name)=>request.cookies.set(name,value));

    const headers = new Headers(request.headers); headers.set("cookie",request.cookies.toString());

    const response = NextResponse.next({request:{headers}});

    if (clear) names.forEach(name=>response.cookies.delete(name));

    else changed.forEach((value,name)=>response.cookies.set(name,value,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:28800}));

    if (access) response.headers.set("Cache-Control","private, no-store");

    return response;

  }

  if (!access) return finish();

  if (sessionIsIdle(activity)) return finish(true);

  if (!activity) changed.set(ACTIVITY_COOKIE,String(Date.now()));

  if (refresh && tokenNeedsRefresh(access)) {

    assertStagingIsolation();

    try {

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,"content-type":"application/json"},body:JSON.stringify({refresh_token:refresh}),cache:"no-store",signal:AbortSignal.timeout(15000)});

      if (response.status===400 || response.status===401) return finish(true);

      if (!response.ok) return finish(); // A temporary provider outage must not erase a valid sign-in.

      const payload = await response.json();

      if (!payload.access_token || !payload.refresh_token || !payload.user?.id) return finish(true);

      changed.set(names[0],payload.access_token); changed.set(names[1],payload.refresh_token); changed.set(names[2],payload.user.id);

    } catch { /* Retain cookies for retry; never log credentials. */ }

  }

  return finish();

}

export const config = {matcher:["/((?!_next/static|_next/image|favicon.ico|assets/|published/|.*\\.(?:png|jpg|jpeg|webp|svg|mp4|mp3|pdf|css|js|woff2?)$).*)"]};


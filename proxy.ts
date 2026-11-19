import {providerFetch as fetch} from '@/server/security/provider-fetch';
import { NextRequest, NextResponse } from "next/server";

import { ACTIVITY_COOKIE, sessionIsIdle, tokenNeedsRefresh } from "@/lib/session-activity";

import { assertStagingIsolation } from "@/server/environment-isolation";
import {tigerAssetAllowed,courseAssetRoute,courseAssetTarget} from '@/server/security/course-assets';
import {editionAssetUrl} from '@/lib/course-editions';
import {getCourseBySlug} from '@/lib/courses';
import {tenantCourseAssigned} from '@/server/services/tenant-courses';

const names = ["alp_access_token", "alp_refresh_token", "alp_user_id", ACTIVITY_COOKIE];

export async function proxy(request: NextRequest) {

  let decodedPath=request.nextUrl.pathname;
  try{decodedPath=decodeURIComponent(decodedPath);}catch{/* Invalid course paths are denied below. */}
  const target=decodedPath.startsWith('/courses/')?courseAssetTarget(request.nextUrl.pathname):null;
  if(process.env.ALP_ENVIRONMENT==='training-production'){
    const slug=/^\/(?:admin\/courses|learn|courses)\/([^/]+)(?:\/|$)/.exec(decodedPath)?.[1];
    const course=slug?getCourseBySlug(slug):undefined;
    const assignedCourse=course?.id??(target?.publicCover?target.courseId:undefined);
    if(assignedCourse){try{if(!await tenantCourseAssigned(assignedCourse,request.cookies.get(names[0])?.value))return new NextResponse('Course not available on this training site.',{status:404,headers:{'cache-control':'private, no-store'}});}catch{return new NextResponse('Course assignments are temporarily unavailable.',{status:503,headers:{'cache-control':'private, no-store'}});}}
  }

  const changed = new Map<string,string>();

  const access = request.cookies.get(names[0])?.value, refresh = request.cookies.get(names[1])?.value;

  const activity = request.cookies.get(ACTIVITY_COOKIE)?.value;

  async function finish(clear = false) {

    if (clear) names.forEach(name => request.cookies.delete(name));

    else changed.forEach((value,name)=>request.cookies.set(name,value));

    if(target&&!target.publicCover){
      const token=request.cookies.get(names[0])?.value;
      const route=token&&['GET','HEAD'].includes(request.method)?await courseAssetRoute(token,target.courseId):null;
      if(!route || target.unit&&!route.preview&&!await tigerAssetAllowed(token!,target.courseId,target.unit)){
        const denied=new NextResponse(request.method==='HEAD'?null:'Course access is unavailable. Sign in and open the course through your learning or review workspace.',{status:403,headers:{'cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff','content-type':'text/plain; charset=utf-8'}});
        if(clear)names.forEach(name=>denied.cookies.delete(name));
        return denied;
      }
      if(route.editionId){
        const destination=request.nextUrl.clone();destination.pathname=editionAssetUrl(route.editionId,request.nextUrl.pathname);
        const response=NextResponse.rewrite(destination,{request:{headers:new Headers({...Object.fromEntries(request.headers),cookie:request.cookies.toString()})}});
        response.headers.set('cache-control','private, no-store');response.headers.set('vary','Cookie');
        changed.forEach((value,name)=>response.cookies.set(name,value,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:28800}));return response;
      }
    }

    const headers = new Headers(request.headers); headers.set("cookie",request.cookies.toString());

    const response = NextResponse.next({request:{headers}});

    if (clear) names.forEach(name=>response.cookies.delete(name));

    else changed.forEach((value,name)=>response.cookies.set(name,value,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:28800}));

    if (access||target&&!target.publicCover) response.headers.set("Cache-Control","private, no-store");
    if(target&&!target.publicCover)response.headers.set('Vary','Cookie');

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

export const config = {matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};


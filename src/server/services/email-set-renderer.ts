import 'server-only';
import {brandedEmail} from '@/server/services/email/send-course-invitation';
import {getCourseCover} from '@/lib/course-covers';
import {getSupabaseRestUrl} from '@/server/auth/session';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
import {interpolateEmail,validateEmailDesign,type EmailDesign} from '@/lib/email-sets';

export type EmailSnapshot={design:EmailDesign;context:Record<string,string>;brand:string;logo_path:string|null;color:string;marketing:boolean;organisation_id:string};
export function renderEmailSet(snapshot:EmailSnapshot){
 const {design}=snapshot;validateEmailDesign(design);
 const context:Record<string,string>=Object.fromEntries(Object.entries(snapshot.context).map(([key,value])=>[key,Array.isArray(value)?value.join(', '):String(value??'')]));
 const values={...context,deadline:context.deadline?new Date(context.deadline).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg',dateStyle:'long',timeStyle:'short'})+' SAST':''};
 const subject=interpolateEmail(design.subject,values).replace(/[\r\n]/g,' ').slice(0,200);
 const heading=interpolateEmail(design.heading,values),body=interpolateEmail(design.body,values),button=interpolateEmail(design.button,values);
 const course=context.course_id&&/^[a-z0-9-]+$/.test(context.course_id)?context.course_id:'';
 const review=context.review_id&&/^[0-9a-f-]{36}$/i.test(context.review_id)?context.review_id:'';
 const path=design.destination==='course'&&course?`/learn/${course}`:design.destination==='review'?(review?`/course-reviews/${review}`:'/course-reviews'):design.destination==='messages'?'/messages':'/catalogue';
 const link=new URL(path,STAGING_ORIGIN).toString();
 const cover=design.image==='course'?getCourseCover(course)?.src:null;
 const image=design.image==='none'?null:design.image==='course'?(cover?new URL(cover,STAGING_ORIGIN).toString():null):design.image;
 const preference=new URL('/messages/email-preferences',STAGING_ORIGIN).toString();
 let html=brandedEmail({brand:snapshot.brand,logo:snapshot.logo_path?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${snapshot.logo_path}`):`${STAGING_ORIGIN}/branding/apgi-logo.png`,color:snapshot.color,title:heading,description:body,link,button,image,footer:'Use the email address this message was sent to when signing in. Contact your company administrator through Messages and support.'}).replace('style="line-height:1.6"','style="line-height:1.6;white-space:pre-line"');
 if(snapshot.marketing)html=html.replace('</body>',`<p style="text-align:center;font:13px Arial"><a href="${preference}">Manage or stop course announcements</a></p></body>`);
 return {subject,html,text:`${snapshot.brand}\n${heading}\n\n${body}\n\n${button}: ${link}${snapshot.marketing?`\nManage or stop course announcements: ${preference}`:''}`};
}

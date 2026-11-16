import {escapeEmail} from './email-format';
export type NotificationMail={id:string;claimToken:string;notificationId:string;revision:number;email:string;message:string;requirement:string|null;path:string|null;action:boolean;sender:string|null;sourceId:string|null};
export function notificationEmail(job:NotificationMail,origin:URL){
 const path=job.path&&/^\/(?!\/)[^\r\n\\]*$/.test(job.path)?job.path:'/notifications';
 const link=new URL(path,origin);if(link.origin!==origin.origin)throw Error('Invalid notification link');
 const instruction=job.action?`You are required to do this: ${job.requirement||job.message}`:`Please read this update. ${job.requirement||job.message}`;
 const text=`You received a new notification in the training platform.\n\n${job.sender?`From: ${job.sender}\n`:''}${job.message}\n\n${instruction}\n\nGo to the notification and required action: ${link}\n\nSign in using ${job.email}. The platform shows the latest status if this request has since changed. An email delivery receipt does not record an endorsement or approval.`;
 return {subject:job.action?'Training platform — action required':'Training platform — new notification',text,html:`<p>You received a new notification in the training platform.</p>${job.sender?`<p>From: ${escapeEmail(job.sender)}</p>`:''}<h2>${escapeEmail(job.message)}</h2><p style="white-space:pre-line">${escapeEmail(instruction)}</p><p><a href="${escapeEmail(link.toString())}">Open the notification and required action</a></p><p>Sign in using ${escapeEmail(job.email)}. The platform shows the latest status. An email receipt does not record an endorsement or approval.</p>`};
}

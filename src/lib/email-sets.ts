import {libraryImage,defaultEmailImage} from './email-image-library';
export const emailTriggers = {
  schedule: 'A date or repeating schedule',
  enrolment: 'Enrolment accepted',
  completion: 'Course passed / completed',
  deadline: 'Incomplete course approaching a deadline',
  group_complete: 'Enrolled group completes a course',
  new_course: 'New course published for learners',
  review_request: 'Review request issued or invitation resent',
  review_complete: 'Review report or assigned decision submitted',
  review_published: 'Reviewed course is published — thank reviewers',
} as const;
export const emailCadences = {once:'Once only',daily:'Daily',weekly:'Weekly',monthly:'Monthly',yearly:'Yearly'} as const;
export type EmailTrigger = keyof typeof emailTriggers;
export type EmailCadence = keyof typeof emailCadences;
export type EmailDesign = {subject:string;heading:string;body:string;button:string;destination:'course'|'review'|'messages'|'catalogue';image:string};
export type EmailRule = {trigger:EmailTrigger;cadence:EmailCadence;audience:'selected'|'enrolled'|'group'|'reviewers'|'members'|'admins';course_id:string;group_id:string;recipients:string[];start_at:string;end_at:string;deadline_at:string;days_before:number;first_time_only:boolean;marketing:boolean;policy_confirmed:boolean};
export type EmailEntry = {id:string;set_id:string;name:string;design:EmailDesign;rule:EmailRule;state:'draft'|'active'|'paused'|'complete';revision:number;activated_at:string|null;next_at:string|null;last_error:string|null};
export type EmailSet = {id:string;organisation_id:string;name:string;policy_notes:string;revision:number};
export type EmailCompany = {id:string;name:string;logo_path:string|null;primary_color:string;slug:string};
export type EmailWorkspace = {images?:EmailLibraryImage[];companies:EmailCompany[];sets:EmailSet[];entries:EmailEntry[];groups:{id:string;organisation_id:string;name:string}[];contacts:{email:string;organisation_id:string}[];activity:{id:string;entry_id:string;recipient:string;state:string;created_at:string;last_error:string|null}[];review_requests:{id:string;organisation_id:string;course_id:string;title:string;status:string;cutoff:string;participants:{email:string;tasks?:string[];scope?:string;role:string;state:string}[];mail:{recipient:string;kind:string;subject:string;state:string;created_at:string}[]}[]};
export type EmailLibraryImage={id:string;organisation_id:string;title:string;course_id:string|null;purpose:'course'|'email'|'both';object_path:string;url:string;created_at:string};
export type EmailActionState={error?:string;success?:string;setId?:string;entryId?:string;html?:string;subject?:string;imageUrl?:string;image?:EmailLibraryImage};
export const emailTokens = ['recipient_name','company_name','course_title','deadline','days_left','progress_percent','group_name','enrolled_count','completed_count','review_scope'] as const;
export const blankRule = ():EmailRule=>({trigger:'schedule',cadence:'once',audience:'selected',course_id:'',group_id:'',recipients:[],start_at:'',end_at:'',deadline_at:'',days_before:14,first_time_only:false,marketing:false,policy_confirmed:false});
const preparedEmails:{name:string;design:EmailDesign;rule:Partial<EmailRule>}[] = [
 {name:'Welcome and support',design:{subject:'Welcome to {{course_title}}',heading:'Welcome to your course',body:'Hello {{recipient_name}},\n\nThank you for enrolling in {{course_title}} with {{company_name}}. You can work through the learning units at your own pace.\n\nPlease contact us through Messages and support if you experience any issues. We are here to help.',button:'Open my course',destination:'course',image:'course'},rule:{trigger:'enrolment',audience:'enrolled'}},
 {name:'Congratulations and experience feedback',design:{subject:'Congratulations on completing {{course_title}}',heading:'Congratulations — you have completed your course',body:'Hello {{recipient_name}},\n\nWell done on completing {{course_title}}. Thank you for learning with {{company_name}}.\n\nHow was your experience? Please tell us what worked well and what we could improve. Select the button to send us your feedback.',button:'Share my experience',destination:'messages',image:'course'},rule:{trigger:'completion',audience:'enrolled'}},
 {name:'Two weeks remaining',design:{subject:'{{course_title}} — {{days_left}} days remaining',heading:'You are making progress — keep going',body:'Hello {{recipient_name}},\n\nYour progress in {{course_title}} is {{progress_percent}}%. The course deadline is {{deadline}}.\n\nPlease sign in and complete your remaining learning units and assessments. Contact us if you need support.',button:'Continue my course',destination:'course',image:'course'},rule:{trigger:'deadline',audience:'enrolled',days_before:14}},
 {name:'Group enrolment feedback',design:{subject:'{{group_name}} — course follow-up',heading:'Your group learning update',body:'Hello {{recipient_name}},\n\nHere is the current update for {{group_name}} on {{course_title}}:\nEnrolled: {{enrolled_count}}\nCompleted: {{completed_count}}\n\nPlease contact us to discuss your group’s learning experience and any further support you need.',button:'Contact the course administrator',destination:'messages',image:'course'},rule:{trigger:'group_complete',audience:'admins'}},
 {name:'New course promotion',design:{subject:'New from {{company_name}}: {{course_title}}',heading:'Explore our new course',body:'Hello {{recipient_name}},\n\n{{course_title}} is now available from {{company_name}}. Explore the course to see whether it is right for you.\n\nAdd your approved first-time enrolment promotion and its terms here before activating this message.',button:'Explore available courses',destination:'catalogue',image:'course'},rule:{trigger:'new_course',audience:'members',first_time_only:true,marketing:true}},
 {name:'Thank you for your review',design:{subject:'Thank you for reviewing {{course_title}}',heading:'Your review contribution is recorded',body:'Hello {{recipient_name}},\n\nThank you for submitting your {{review_scope}} review of {{course_title}}. Your contribution helps us improve the learning experience.\n\nThe remaining approvals and corrections still apply. We will let you know when the final course has been published.',button:'Open the review workspace',destination:'review',image:'course'},rule:{trigger:'review_complete',audience:'reviewers'}},
 {name:'Final course published — reviewer thanks',design:{subject:'{{course_title}} has been published — thank you',heading:'The final reviewed course is published',body:'Hello {{recipient_name}},\n\nThank you for contributing to the {{review_scope}} review of {{course_title}}.\n\nThe reviewed content, commercial and branding approvals are complete, and the final course offering has been published. Learner enrolment remains subject to the offering’s access and payment arrangements.',button:'View the published release',destination:'review',image:'course'},rule:{trigger:'review_published',audience:'reviewers'}},
 {name:'One-off or repeating company message',design:{subject:'An update from {{company_name}}',heading:'Your company update',body:'Hello {{recipient_name}},\n\nWrite your message here. Explain the action, dates and support options clearly.',button:'Messages and support',destination:'messages',image:'none'},rule:{trigger:'schedule',audience:'selected'}},
 {name:'Review request and invitation',design:{subject:'Please review {{course_title}}',heading:'You are invited to review this course',body:'Hello {{recipient_name}},\n\n{{company_name}} invites you to review {{course_title}}. Your assignments are: {{review_scope}}.\n\nPlease open the review workspace, read the review instructions and complete your assigned work by {{deadline}}. Record findings and questions in the shared review so the team can respond.\n\nThank you for helping us prepare a clear and useful course. Please contact the review requester if you need help or cannot complete the assignment.',button:'Open my review request',destination:'review',image:'library:reviews-01'},rule:{trigger:'review_request',audience:'reviewers'}},
];

export const emailStarters=preparedEmails.map(starter=>({...starter,design:{...starter.design,image:defaultEmailImage[starter.rule.trigger??'schedule']}}));

export function interpolateEmail(value:string,context:Record<string,string>){
 return value.replace(/\{\{\s*([a-z_]+)\s*\}\}/g,(_,key:string)=>context[key]??`[${key}]`);
}
export function validateEmailDesign(design:EmailDesign){
 for(const [key,max] of Object.entries({subject:200,heading:200,body:20000,button:80})){
  const value=design[key as keyof EmailDesign];if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`Enter a ${key} of 1–${max} characters.`);
  for(const token of value.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g))if(!emailTokens.includes(token[1] as typeof emailTokens[number]))throw Error(`Unknown field: ${token[1]}. Use a field from the list.`);
 }
 if(/[\r\n]/.test(design.subject))throw Error('The email subject must be a single line.');
 if(!['course','review','messages','catalogue'].includes(design.destination))throw Error('Choose a platform destination.');
 if(design.image.startsWith('library:')){if(!libraryImage(design.image))throw Error('Choose an image from the shared library.');}
 else if(!['none','course'].includes(design.image)){let url:URL;try{url=new URL(design.image);}catch{throw Error('Choose a library image, course graphic, no graphic, or an HTTPS image URL.');}if(url.protocol!=='https:'||url.username||url.password||design.image.length>1500)throw Error('Use a public HTTPS image URL without a username or password.');}
}

// Calendar months/years retain the original SAST day, avoiding drift after February.
export function nextEmailOccurrence(start:string,cadence:EmailCadence,now:Date):string|null{
 if(cadence==='once')return null;
 const anchor=new Date(Date.parse(start)+2*3600000),cutoff=now.getTime();
 if(cadence==='daily'||cadence==='weekly'){
  const step=(cadence==='daily'?1:7)*86400000;
  return new Date(Date.parse(start)+Math.max(0,Math.floor((cutoff-Date.parse(start))/step)+1)*step).toISOString();
 }
 let months=(now.getUTCFullYear()-anchor.getUTCFullYear())*12+now.getUTCMonth()-anchor.getUTCMonth();
 const stride=cadence==='yearly'?12:1;months=Math.max(0,Math.floor(months/stride)*stride);
 for(;;months+=stride){const first=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+months,1,anchor.getUTCHours(),anchor.getUTCMinutes()));const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();first.setUTCDate(Math.min(anchor.getUTCDate(),last));const next=first.getTime()-2*3600000;if(next>cutoff)return new Date(next).toISOString();}
}

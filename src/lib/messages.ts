export type MessageState={error?:string;success?:string;threadId?:string};
export type MessageContact={email:string;label:string};
export type MessageScope={id:string;name:string;admin:boolean};
export type MessageThread={id:string;subject:string;organisation_id:string|null;created_by?:string;level:string;status:string;updated_at:string;unread:number};
export type SavedMessage={id:string;sender_email:string;body:string;created_at:string;attachment_name:string|null;receipts:{email:string;read_at:string|null;state:string}[]};
export type MessageTemplate={id:string;name:string;subject:string;body:string};
export type MessageSchedule={id:string;subject:string;cadence:string;next_at:string;end_at:string|null;state:string;recipients:string[];sent_count:number;last_error:string|null};
export type MessageWorkspace={scopes:MessageScope[];contacts:MessageContact[];admin:boolean;threads:MessageThread[];templates:MessageTemplate[];schedules:MessageSchedule[]};
export const messageExamples=[
 {name:"Welcome to your course",subject:"Welcome to your course",body:"Thank you for enrolling. We look forward to supporting your learning. Please contact your company administrator through Messages and support if you experience any difficulties."},
 {name:"Course deadline reminder",subject:"Your course deadline is approaching",body:"Your course deadline is approaching. Please check your progress and complete the remaining learning units and assessments. Contact your company administrator if you need assistance or would like to request an extension."},
 {name:"Company enrolment follow-up",subject:"Following up on your team's enrolments",body:"Thank you for enrolling your team. Please let us know whether everyone has been able to sign in and access their courses, and whether you need any assistance."},
];
export function messageDate(value:string){return new Date(value).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"});}
export function parseRecipients(raw:FormDataEntryValue|null){const emails=[...new Set(String(raw??"").split(/[;,\n]/).map(e=>e.trim().toLowerCase()).filter(Boolean))];if(!emails.length||emails.length>200||emails.some(e=>!/^[-a-z0-9.!#$%&'*+/=?^_`{|}~]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(e)))throw Error("Enter 1 to 200 valid recipient email addresses, separated by commas or new lines.");return emails;}
export function sastInput(value:string){if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))throw Error("Choose a valid date and time (South African time).");const date=new Date(value+":00+02:00");if(!Number.isFinite(date.getTime()))throw Error("Choose a valid date and time.");return date.toISOString();}

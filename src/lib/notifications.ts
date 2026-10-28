export type NotificationResponse = "read" | "acknowledge" | "action";
export type PersonalNotification = {
 recipient_email?:string;sender_email?:string|null;unit_slug?:string|null;reminder_count?:number;last_reminded_at?:string|null;can_remind?:boolean;
 id:string;message:string;kind:string;created_at:string;read_at:string|null;acknowledged_at:string|null;
 target_path:string|null;response_type:NotificationResponse;pending:boolean;actor_user_id:string|null;
 reference_number?:number;source_type?:string|null;source_id?:string|null;event_key?:string;
 requirement?:string;action_label?:string;resolved_at?:string;
 context?:{review_task?:string;task_pending?:boolean;requirement?:string;resolved_at?:string;legacy_review_reminder?:boolean;unit?:string;reminder_for?:string};
 event?:{action:string;actor?:string;detail?:string;version?:string;task_decision?:{id:string;task:string;email:string;target:string;decision:string;comment:string};proposal?:{id:string;comment:string};report_id?:string;finding_id?:string;event_index?:number}|null;
};
export type NotificationCounts={unread:number;responses:number;attention:number};
export type NotificationInbox=NotificationCounts&{total:number;items:PersonalNotification[];receipts:(PersonalNotification&{recipient_email:string})[]};
export function notificationTarget(path:string|null,message="") {
 const target=path??message.match(/\/course-reviews\/[0-9a-f-]{36}/i)?.[0]??"/notifications";
 if(/^\/messages(?:\/[0-9a-f-]{36})?$/i.test(target))return target;
 return /^(?:\/notifications|\/payments|\/payments\/reports\?scope=(?:all|self|[0-9a-f-]{36})&table=[a-z_]+|\/admin\/learners|\/admin\/invitations|\/admin\/payments\/stripe(?:\/private)?|\/catalogue(?:\?view=my-learning)?|\/course-reviews\/[0-9a-f-]{36}(?:\/commercials)?|\/policies\/[0-9a-f-]{36}|\/company\/[0-9a-f-]{36}(?:\/payments)?)(?:#[a-z0-9_-]+)?$/i.test(target)?target:"/notifications";
}
export const notificationReference=(n:Pick<PersonalNotification,"id"|"reference_number">)=>n.reference_number?`Notification ${n.reference_number}`:`Notification ${n.id.slice(0,8).toUpperCase()}`;
export const notificationStatus=(n:PersonalNotification)=>n.target_path==="/notifications#archived-company-request"?"No response required — company inactive or unavailable":n.response_type==="acknowledge"?(n.acknowledged_at?"Acknowledged":"Acknowledgement requested"):n.response_type==="action"?(n.pending?"Action required":"Action completed or no longer required"):n.read_at?"Read":"Unread";
export function countNotifications(items:PersonalNotification[]):NotificationCounts {
 return {unread:items.filter(n=>!n.read_at).length,responses:items.filter(n=>n.pending).length,attention:items.filter(n=>!n.read_at||n.pending).length};
}

export function NotificationAddress({recipient,sender}:{recipient?:string;sender?:string|null}){
 return <p className="notification-address"><strong>To: {recipient??'Your signed-in account'}</strong><br/>From: {sender??'Platform workflow'}</p>;
}

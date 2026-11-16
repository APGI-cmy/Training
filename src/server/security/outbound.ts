import 'server-only';
// One mailbox per delivery: display names, lists, control characters and reserved
// synthetic domains must never be interpreted as additional recipients.
export function singleRecipient(value:string,staging:boolean){
 if(value!==value.trim()||value.length>254||/[\s<>(),;:\[\]\\\u0000-\u001f\u007f]/.test(value))return false;
 const parts=value.split('@');if(parts.length!==2)return false;
 const [local,domain]=parts;
 if(!local||local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..')||!/^[A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+$/.test(local))return false;
 if(!/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(domain))return false;
 return !(staging&&/(?:^|\.)invalid$/i.test(domain));
}
export function safeDatabasePath(path:string){
 if(!/^\/(?:rest|auth|storage)\/v1(?:\/|\?)/.test(path)||/[\\\r\n\u0000]/.test(path))return false;
 try{return !decodeURIComponent(path.split('?')[0]).split('/').some(p=>p==='.'||p==='..');}catch{return false;}
}

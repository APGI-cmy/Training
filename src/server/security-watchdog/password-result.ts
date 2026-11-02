// GoTrue's raw HTTP error_code differs from the SDK's translated string code.
// A rejection must be an actual weak-password response, never an outage or a
// denied/expired sign-in. The pwned probe also requires its specific reason.
export function weakPasswordRejected(status:number,value:unknown,reason?:'pwned'|'length'){
 if(status!==400&&status!==422||!value||typeof value!=='object')return false;
 const error=value as {error_code?:unknown;code?:unknown;weak_password?:{reasons?:unknown}};
 if((error.error_code??error.code)!=='weak_password')return false;
 return !reason||Array.isArray(error.weak_password?.reasons)&&error.weak_password.reasons.includes(reason);
}

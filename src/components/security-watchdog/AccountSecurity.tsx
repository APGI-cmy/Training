'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
type Factor={id:string;status:string;friendly_name?:string};
export function AccountSecurity({factors,mfaRequired,reauthenticate=false}:{factors:Factor[];mfaRequired:boolean;reauthenticate?:boolean}){
 const [setup,setSetup]=useState<{factorId:string;qr:string;secret:string}|null>(null),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const router=useRouter();
 const verified=factors.find(f=>f.status==='verified'),pending=factors.find(f=>f.status!=='verified');
 async function act(operation:string,factorId?:string){setBusy(true);setMessage('');try{const r=await fetch('/api/account-security',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation,factorId,code})});const data=await r.json();if(!r.ok)throw Error(data.error);if(operation==='enrol')setSetup(data);else{setSetup(null);setCode('');setMessage(operation==='verify'?'Authenticator verified. Your account now requires its second factor when you sign in.':'Unfinished setup cancelled.');router.refresh();}}catch(e){setMessage(e instanceof Error?e.message:'The request could not finish.');}finally{setBusy(false);}}
 return <section className="watchdog-box"><h2>Protect my account</h2><p>Only your own authenticator can be set up here. Use an authenticator app on your phone. Keep its recovery and device-backup arrangements secure; APGI does not store or display another user’s setup code.</p>{mfaRequired?<p className="watchdog-note"><strong>Two-step verification is required.</strong> {verified?'Enter your authenticator code to open the rest of the platform.':'Administrators and company owners must set up and verify their own authenticator before opening protected workspaces.'}</p>:null}
 {verified&&!mfaRequired?<p><strong>Authenticator enrolled and this session has completed the second factor.</strong></p>:null}
 {!verified&&!pending&&!setup?<button type="button" className="primary-button" disabled={busy} onClick={()=>void act('enrol')}>Set up my authenticator</button>:null}
 {setup?<div className="authenticator-setup">
  <div>
   <h3>Set up two-step verification (MFA)</h3>
   <ol>
    <li>Open an authenticator app on your phone, such as Microsoft Authenticator or Google Authenticator. Install one from your phone’s app store if needed.</li>
    <li>In the app, tap <strong>Add account</strong> or <strong>+</strong>. Choose <strong>Scan QR code</strong> and point the camera at the code shown here. If asked for an account type, choose <strong>Other account</strong>.</li>
    <li>Enter the current six-digit code from the app under <strong>Authenticator code</strong>, then select <strong>Verify my authenticator</strong>. If the code expires, use the next one the app shows.</li>
   </ol>
   <p>Keep the QR code, setup key and verification codes private.</p>
  </div>
  <div>
   <img alt="Your private authenticator setup QR code" src={setup.qr.startsWith('data:')?setup.qr:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(setup.qr)} width="220" height="220"/>
   <details>
    <summary>Enter setup key manually instead</summary>
    <p>If you’re using the same phone or can’t scan, choose manual entry in your authenticator app. Name the account and select <strong>Time based</strong> if asked, then enter this setup key.</p>
    <code>{setup.secret}</code>
   </details>
  </div>
 </div>:null}
 {reauthenticate&&verified?<p>Verify a fresh code before downloading the encrypted recovery package. Then <a href="/security-watchdog#recovery-secrets">return to the recovery download</a>.</p>:null}
 {(setup||verified&&(mfaRequired||reauthenticate))?<form onSubmit={e=>{e.preventDefault();void act('verify',setup?.factorId??verified?.id);}}><label>Authenticator code<input type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} minLength={6} required value={code} onChange={e=>setCode(e.target.value)} /></label><button className="primary-button" disabled={busy}>{busy?'Verifying…':'Verify my authenticator'}</button></form>:null}
 {pending||setup?<button type="button" className="secondary-button" disabled={busy} onClick={()=>void act('cancel',setup?.factorId??pending?.id)}>Cancel unfinished setup</button>:null}
 <p role="status" aria-live="polite">{message}</p><a href="/dashboard">Continue to my dashboard</a></section>;
}

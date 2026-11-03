'use client';
import {useState} from 'react';
export function RecoveryExport(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function download(){
  if(busy)return;setBusy(true);setMessage('Preparing the encrypted recovery package.');
  try{const r=await fetch('/api/security-watchdog/recovery-export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirm:true})});
   if(!r.ok){const data=await r.json();throw new Error(data.error??'The recovery download could not be prepared.');}
   const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`APGI-V2-service-recovery-${new Date().toISOString().slice(0,10)}.pgp`;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);
   setMessage('The encrypted package was prepared for download. Check your browser downloads before copying it to the approved backup folder.');
  }catch(e){setMessage(e instanceof Error?e.message:'The recovery download could not finish.');}finally{setBusy(false);}
 }
 return <section className="watchdog-box" id="recovery-secrets"><h2>Encrypted service recovery backup</h2><p>Main APGI administrators can back up the running V2 service credentials. Verify your authenticator immediately before downloading. Only your separately held recovery key can open the package.</p><p><a href="/account-security?reauth=1">Verify my authenticator for this download</a></p><button type="button" className="secondary-button" disabled={busy} onClick={()=>void download()}>{busy?'Preparing encrypted package…':'Download encrypted recovery package'}</button><p role="status" aria-live="polite">{message}</p><p className="watchdog-small">Recovery recipient: 3D90 ACEB 24A3 B6BE 23B7 A3FE 0C28 764C E3B0 4BFE. Save the encrypted file in the approved backup folder. Keep its recovery key separately in SecurePass.</p></section>;
}

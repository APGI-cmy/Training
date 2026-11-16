// The project WAF denies this exact path. A failed WAF rule reveals only this
// fixed harmless marker; the probe then fails instead of assuming protection.
export function GET(){return new Response('APGI-WATCHDOG-EDGE-CANARY',{headers:{'content-type':'text/plain','cache-control':'no-store','x-content-type-options':'nosniff'}});}

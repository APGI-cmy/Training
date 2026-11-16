import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { CertificateRecord } from "@/lib/certificates/designs";
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
  return value;
}
export function signCertificate(c: Omit<CertificateRecord,"signature"|"status">, secret = process.env.CERTIFICATE_SIGNING_SECRET) {
  if (!secret || secret.length<32) throw new Error("Certificate signing is not configured.");
  return createHmac("sha256",secret).update(JSON.stringify(canonical({ id:c.id,number:c.certificate_number,user:c.user_id,course:c.course_id,organisation:c.organisation_id,issued:new Date(c.issued_at).toISOString(),snapshot:c.snapshot }))).digest("hex");
}
export function authenticCertificate(c: CertificateRecord, secret = process.env.CERTIFICATE_SIGNING_SECRET) {
  if (!/^[a-f0-9]{64}$/.test(c.signature)) return false;
  const expected=Buffer.from(signCertificate(c,secret),"hex"); return timingSafeEqual(expected,Buffer.from(c.signature,"hex"));
}

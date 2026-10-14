import { frame, type CertificateSnapshot } from "@/lib/certificates/designs";
export function CertificatePreview({ snapshot: s, number = "APGI-V2-PREVIEW", date = "14 October 2026", logoUrl, verificationUrl }: { snapshot: CertificateSnapshot; number?: string; date?: string; logoUrl?: string | null; verificationUrl?: string }) {
  return <svg className="certificate-preview" viewBox="0 0 842 595" role="img" aria-label={`Certificate design for ${s.organisation}`}>
    <rect width="842" height="595" fill="white" />{frame(s).map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.radius ?? 0} fill={r.stroke?'none':r.color} stroke={r.stroke?r.color:'none'} strokeWidth={1.5} />)}
    {logoUrl ? <image href={logoUrl} x="331" y="57" width="180" height="54" preserveAspectRatio="xMidYMid meet" /> : null}
    <g fill="#142d46" textAnchor="middle" fontFamily="Arial, sans-serif">
      <text x="421" y={logoUrl ? 136 : 104} fontSize="19" fontWeight="bold">{s.organisation}</text>
      <text x="421" y="184" fontSize="30" letterSpacing="2">CERTIFICATE OF COMPLETION</text>
      <text x="421" y="218" fontSize="13">This certificate is awarded to</text>
      <text x="421" y="267" fontSize="30" fontWeight="bold" textLength={s.name.length>32?630:undefined} lengthAdjust="spacingAndGlyphs">{s.name}</text>
      <text x="421" y="302" fontSize="13">for successful completion of</text>
      <text x="421" y="334" fontSize="20" textLength={s.course.length>48?640:undefined} lengthAdjust="spacingAndGlyphs">{s.course}</text>
      <text x="421" y="366" fontSize="11">{s.statement}</text>
      <text x="421" y="446" fontSize="10" fill="#142d46">{date}</text>
      <text x="421" y="495" fontSize="10">Certificate number: {number}</text>
      {s.test ? <text x="421" y="517" fontSize="13" fontWeight="bold" fill="#b22525">TEST CERTIFICATE — NOT VALID FOR QUALIFICATION</text> : null}
    </g>
    <rect x="644" y="575" width="175" height="18" fill="white" />
    <text x="805" y="587" textAnchor="end" fontSize="10" fontFamily="Arial" fill="#142d46">Hosted by APGI</text>
    {verificationUrl ? <text x="70" y="528" fontSize="8" fill="#142d46">Verify using the code printed on the downloadable certificate.</text> : null}
  </svg>;
}

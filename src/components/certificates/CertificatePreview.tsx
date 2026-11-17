import { frame, certificateHeaderLayout, type CertificateSnapshot } from "@/lib/certificates/designs";
import {watermark} from '@/lib/watermarks';
export function CertificatePreview({ snapshot: s, number = "APGI-V2-PREVIEW", date = "14 October 2026", logoUrl, watermarkUrl, verificationUrl }: { snapshot: CertificateSnapshot; number?: string; date?: string; logoUrl?: string | null; watermarkUrl?:string|null;verificationUrl?: string }) {
  const header=certificateHeaderLayout(s,!!logoUrl);
  const w=watermark(s.watermark); const decoration=frame(s).map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.radius ?? 0} fill={r.stroke?'none':r.color} stroke={r.stroke?r.color:'none'} strokeWidth={1.5} />);
  return <svg className="certificate-preview" viewBox="0 0 842 595" role="img" aria-label={`Certificate design for ${s.organisation}`}>
    <rect width="842" height="595" fill="white" />{s.watermarkLayout!=='page-cover-v1'?decoration:null}
    {(w.kind==='logo'&&logoUrl)||(w.kind==='image'&&watermarkUrl)?<image aria-hidden="true" href={w.kind==='image'?watermarkUrl!:logoUrl!} x={w.kind==="image"&&s.watermarkLayout==="page-cover-v1"?0:231} y={w.kind==="image"&&s.watermarkLayout==="page-cover-v1"?0:213} width={w.kind==="image"&&s.watermarkLayout==="page-cover-v1"?842:380} height={w.kind==="image"&&s.watermarkLayout==="page-cover-v1"?595:170} opacity={w.opacity} preserveAspectRatio={w.kind==="image"&&s.watermarkLayout==="page-cover-v1"?"xMidYMid slice":"xMidYMid meet"}/>:w.kind==='text'?<text aria-hidden="true" x="421" y="310" textAnchor="middle" transform="rotate(-25 421 298)" fontFamily="Arial,sans-serif" fontSize={Math.min(62,1000/Math.max(1,w.text.length))} fontWeight="bold" fill="#142d46" opacity={w.opacity}>{w.text}</text>:null}
    {s.watermarkLayout==='page-cover-v1'?decoration:null}
    {logoUrl ? <image href={logoUrl} x={(842-header.logoWidth)/2} y={header.logoTop} width={header.logoWidth} height={header.logoHeight} preserveAspectRatio="xMidYMid meet" /> : null}
    <g fill="#142d46" textAnchor="middle" fontFamily="Arial, sans-serif">
      {header.showOrganisation?<text x="421" y={logoUrl ? 136 : 104} fontSize="19" fontWeight="bold">{s.organisation}</text>:null}
      <text x="421" y="184" fontSize="30" letterSpacing="2">CERTIFICATE OF COMPLETION</text>
      <text x="421" y="218" fontSize="13">This certificate is awarded to</text>
      <text x="421" y="267" fontSize="30" fontWeight="bold" textLength={s.name.length>32?630:undefined} lengthAdjust="spacingAndGlyphs">{s.name}</text>
      <text x="421" y="302" fontSize="13">for successful completion of</text>
      <text x="421" y="334" fontSize="20" textLength={s.course.length>48?640:undefined} lengthAdjust="spacingAndGlyphs">{s.course}</text>
      <text x="421" y="366" fontSize="11">{s.statement}</text>
      <text x="421" y="446" fontSize="10" fill="#142d46">{date}</text>
      <text x="421" y="495" fontSize="10">Certificate number: {s.platformAttribution==="hidden-v1"&&number==="APGI-V2-PREVIEW"?"TRAINING-PREVIEW":number}</text>
      {s.test ? <text x="421" y="517" fontSize="13" fontWeight="bold" fill="#b22525">TEST CERTIFICATE — NOT VALID FOR QUALIFICATION</text> : null}
    </g>
    {s.platformAttribution!=="hidden-v1"?<><rect x="644" y="575" width="175" height="18" fill="white" /><text x="805" y="587" textAnchor="end" fontSize="10" fontFamily="Arial" fill="#142d46">Hosted by APGI</text></>:null}
    {verificationUrl ? <text x="70" y="528" fontSize="8" fill="#142d46">Verify using the code printed on the downloadable certificate.</text> : null}
  </svg>;
}

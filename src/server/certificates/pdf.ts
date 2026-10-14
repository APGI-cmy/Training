import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import sharp from "sharp";
import { frame, safeColor, type CertificateRecord } from "@/lib/certificates/designs";
import { getSupabaseRestUrl } from "@/server/auth/session";

export async function certificatePdf(c: CertificateRecord) {
  const doc=await PDFDocument.create(); doc.registerFontkit(fontkit);
  const [regular,bold]=await Promise.all(['Regular','Bold'].map(async n=>doc.embedFont(await readFile(path.join(process.cwd(),`public/certificate-fonts/NotoSans-${n}.ttf`)),{subset:true})));
  const page=doc.addPage([842,595]); const s=c.snapshot;
  function color(hex:string){const h=safeColor(hex);return rgb(parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255);}
  for(const r of frame(s)) {
    if(r.radius) page.drawEllipse({x:r.x+r.w/2,y:595-r.y-r.h/2,xScale:r.w/2,yScale:r.h/2,color:color(r.color)});
    else page.drawRectangle({x:r.x,y:595-r.y-r.h,width:r.w,height:r.h,...(r.stroke?{borderColor:color(r.color),borderWidth:1.5}:{color:color(r.color)})});
  }
  const ink=color('#142d46');
  function centre(text:string,y:number,size:number,strong=false,maxWidth=670,fill=ink){const f=strong?bold:regular;const actual=Math.min(size,size*maxWidth/Math.max(1,f.widthOfTextAtSize(text,size)));page.drawText(text,{x:(842-f.widthOfTextAtSize(text,actual))/2,y:595-y,size:actual,font:f,color:fill});}
  let logo: Awaited<ReturnType<typeof doc.embedPng>> | null=null;
  if(s.logoPath){
    // Fetch only the controlled branding bucket in this isolated database.
    const url=getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${s.logoPath.split('/').map(encodeURIComponent).join('/')}`);
    if(url){const response=await fetch(url,{redirect:'error'});if(!response.ok) throw new Error('Organisation logo is unavailable.');const type=response.headers.get('content-type')??'';const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>5_000_000)throw new Error('Organisation logo is too large.');if(type.includes('png'))logo=await doc.embedPng(bytes);else if(type.includes('jpeg'))logo=await doc.embedJpg(bytes);else if(type.includes('webp'))logo=await doc.embedPng(await sharp(bytes,{limitInputPixels:20_000_000}).png().toBuffer());else throw new Error('Use a PNG, JPEG or WebP organisation logo for certificate export.');}
  } else if(s.organisation==='APGI'){logo=await doc.embedPng(await readFile(path.join(process.cwd(),'public/branding/apgi-logo.png')));}
  if(logo){const d=logo.scaleToFit(180,54);page.drawImage(logo,{x:(842-d.width)/2,y:595-57-d.height,width:d.width,height:d.height});}
  centre(s.organisation,logo?136:104,19,true);centre('CERTIFICATE OF COMPLETION',184,28,true);
  centre('This certificate is awarded to',218,13);centre(s.name,267,30,true);
  centre('for successful completion of',302,13);centre(s.course,334,20,true);
  centre(s.statement,366,11);centre(new Date(c.issued_at).toLocaleDateString('en-ZA',{year:'numeric',month:'long',day:'numeric',timeZone:'Africa/Johannesburg'}),446,10);
  centre(`Certificate number: ${c.certificate_number}`,495,10);
  if(s.test)centre('TEST CERTIFICATE - NOT VALID FOR QUALIFICATION',517,13,true,650,color('#b22525'));
  page.drawRectangle({x:644,y:2,width:175,height:18,color:rgb(1,1,1)});
  page.drawText('Hosted by APGI',{x:725,y:8,size:10,font:bold,color:ink});
  const verify=new URL(`/verify-certificate/${c.id}`,process.env.NEXT_PUBLIC_APP_URL).toString();
  const qr=await doc.embedPng(await QRCode.toBuffer(verify,{type:'png',margin:1,errorCorrectionLevel:'M'}));
  page.drawImage(qr,{x:739,y:82,width:58,height:58});page.drawText('Scan to verify',{x:739,y:65,size:7,font:regular,color:ink});
  page.drawText(`Verify: ${c.id}`,{x:70,y:67,size:8,font:regular,color:ink});
  doc.setTitle(`${c.certificate_number} - ${s.course}`);doc.setSubject(`Authenticated certificate; verification URL ${verify}`);doc.setCreator('APGI Training');doc.setCreationDate(new Date(c.issued_at));
  return doc.save();
}

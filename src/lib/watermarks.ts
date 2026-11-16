export type Watermark={kind:'none'|'logo'|'text'|'image';text:string;opacity:number;imagePath?:string};
export const safeWatermarkPath=(value:unknown):value is string=>typeof value==='string'&&/^organisations\/[0-9a-f-]{36}\/watermarks\/[0-9a-f-]{36}\.png$/i.test(value);
export type CompanyWatermarks={platform:Watermark;certificate:Watermark};
export const blankWatermark=():Watermark=>({kind:'none',text:'',opacity:0.07});
export function coverImage(width:number,height:number,pageWidth=842,pageHeight=595){const scale=Math.max(pageWidth/width,pageHeight/height);return {x:(pageWidth-width*scale)/2,y:(pageHeight-height*scale)/2,width:width*scale,height:height*scale};}
export function watermark(value:unknown):Watermark{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 return {kind:v.kind==='logo'||v.kind==='text'||v.kind==='image'?v.kind:'none',text:typeof v.text==='string'?v.text.slice(0,80):'',opacity:typeof v.opacity==='number'&&Number.isFinite(v.opacity)?Math.max(0.02,Math.min(0.5,v.opacity)):0.07,...(safeWatermarkPath(v.imagePath)?{imagePath:v.imagePath}:{})};
}
export function companyWatermarks(value:unknown):CompanyWatermarks{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};return {platform:watermark(v.platform),certificate:watermark(v.certificate)};
}
export function watermarkFromForm(form:FormData,prefix:string,hasLogo:boolean,imagePath?:string):Watermark{
 const kind=String(form.get(`${prefix}_kind`)??'none'),text=String(form.get(`${prefix}_text`)??'').trim(),raw=form.get(`${prefix}_opacity`),percent=raw===null||raw===''?7:Number(raw);
 if(!['none','logo','text','image'].includes(kind)||text.length>80||!Number.isFinite(percent)||percent<2||percent>50)throw Error('Choose a watermark strength between 2% and 50%.');
 if(kind==='logo'&&!hasLogo)throw Error('Upload the company logo first, or choose a text watermark.');
 if(kind==='text'&&!text)throw Error('Enter the watermark text.');
 if(kind==='image'&&!safeWatermarkPath(imagePath))throw Error('Upload a watermark image first.');
 return {kind:kind as Watermark['kind'],text,opacity:percent/100,...(safeWatermarkPath(imagePath)?{imagePath}:{})};
}

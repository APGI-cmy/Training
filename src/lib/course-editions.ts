import type { Course } from '@/types/course';

export type EditionCourse = Course & {editionId?:string;editionNumber?:number;baseCourseId?:string};
export type AssetSegment = {block:string;offset:number;length:number};
export function savedLearnerResponses(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 return Object.fromEntries(Object.entries(value).filter(([key])=>/^cmi\.interactions\.\d+\.(?:id|type|learner_response|student_response|result|latency|timestamp|time|description)$/.test(key)));
}
export function validEditionPath(parts:string[]):string|null {
 if(!Array.isArray(parts)||!parts.length||parts.some(p=>typeof p!=='string'||!p||p==='.'||p==='..'||/[\\%?#\u0000-\u001f\u007f]/.test(p)))return null;
 const path='/'+parts.join('/');return path.startsWith('/courses/')?path:null;
}
export function editionAssetUrl(edition:string,path:string):string {
 if(!/^[a-f0-9-]{36}$/.test(edition))throw Error('Invalid edition');
 const decoded=decodeURIComponent(path);if(!validEditionPath(decoded.slice(1).split('/')))throw Error('Invalid edition asset');
 return `/api/editions/${edition}/assets${decoded.split('/').map(encodeURIComponent).join('/')}`;
}
export function freezeCoursePaths(course:Course,edition:string,number:number):EditionCourse {
 function map(value:unknown):unknown {
  if(typeof value==='string'&&value.startsWith('/courses/'))return editionAssetUrl(edition,value);
  if(Array.isArray(value))return value.map(map);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,map(v)]));
  return value;
 }
 return {...map(course) as Course,editionId:edition,editionNumber:number,baseCourseId:(course as EditionCourse).baseCourseId??course.id};
}
export function accessHasExpired(expires:string|null|undefined,now=Date.now()):boolean {
 if(expires==null)return false;const value=Date.parse(expires);return !Number.isFinite(value)||value<=now;
}
export function byteRange(value:string|null,size:number):{start:number;end:number;partial:boolean}|null {
 if(!Number.isSafeInteger(size)||size<0)return null;
 if(!value)return {start:0,end:size-1,partial:false};
 const match=/^bytes=(\d*)-(\d*)$/.exec(value);if(!match||!size||(!match[1]&&!match[2]))return null;
 const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
 return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<size&&end>=start?{start,end,partial:true}:null;
}
export function segmentRanges(segments:AssetSegment[],start:number,end:number){
 let position=0;const requests:Array<{block:string;start:number;end:number}>=[];
 for(const s of segments){
  if(!/^[a-f0-9]{64}$/.test(s.block)||!Number.isSafeInteger(s.offset)||!Number.isSafeInteger(s.length)||s.offset<0||s.length<=0||s.offset+s.length>16777216)throw Error('Invalid asset manifest');
  const from=Math.max(start,position),to=Math.min(end,position+s.length-1);
  if(to>=from)requests.push({block:s.block,start:s.offset+from-position,end:s.offset+to-position});position+=s.length;
 }
 if(end>=position)throw Error('Incomplete asset manifest');return requests;
}
export function discountedCents(amount:number,discountBps:number,minimum:number){
 if(![amount,discountBps,minimum].every(Number.isSafeInteger)||amount<=0||minimum<=0||discountBps<0||discountBps>9900)throw Error('Invalid offer');
 const price=Math.round(amount*(10000-discountBps)/10000);if(price<minimum)throw Error('Discount is below the approved minimum');return price;
}

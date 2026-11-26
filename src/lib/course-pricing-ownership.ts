export const TIGER_COURSE_ID='tiger-kidnapping-telecommunications';
export const TIGER_PRICING_OWNER_SLUG='nks-capital';

export function canSetCoursePrices(companySlug:string,principal:boolean,companyOwner:boolean){
 return companySlug==='apgi'?principal:companyOwner;
}

export function pricingOwnerId(courseId:string,recordedOwner:string,companies:readonly {id:string;slug:string}[]){
 // Earlier Tiger review and credit snapshots predate NKS's confirmed pricing authority.
 if(courseId===TIGER_COURSE_ID)return companies.find(c=>c.slug===TIGER_PRICING_OWNER_SLUG)?.id;
 return recordedOwner;
}

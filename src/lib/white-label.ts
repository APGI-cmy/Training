export const isPartnerBrand=(name:string)=>!/^APGI(?:\s+Training)?$/i.test(name.trim());
export function visibleBrandFooter(name:string,footer:string){return isPartnerBrand(name)?footer.replace(/Hosted by APGI[.\s]*/gi,'').replace(/\bAPGI\b/gi,'').trim():footer;}
export function trainingName(name:string){return /training$/i.test(name.trim())?name.trim():`${name.trim()} Training`;}

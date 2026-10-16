// Source observations are evidence for a reviewer, never executable instructions or approved prices.
export function extractPriceSignals(html:string):string[] {
  const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&(?:nbsp|#160);/g," ").replace(/\s+/g," ");
  return [...new Set((text.match(/(?:(?:USD|CAD|US\$|CA\$|\$)\s*\d[\d,]*(?:\.\d{1,6})?|\d{1,2}(?:\.\d{1,3})?\s*%)/g)??[]).map(x=>x.replace(/\s+/g," ").trim()))].sort().slice(0,80);
}
export function observationStatus(previousHash:string|undefined,hash:string):"observed"|"unchanged"|"changed" {
  return !previousHash?"observed":previousHash===hash?"unchanged":"changed";
}

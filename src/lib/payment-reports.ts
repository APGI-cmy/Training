export function paymentPortalEligible(roles:string[],companyOwner:boolean){return companyOwner||roles.some(r=>["admin","reviewer","course_publisher"].includes(r));}
export function csvCell(value:unknown){let s=value===null||value===undefined?"":typeof value==="object"?JSON.stringify(value):String(value);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function paymentCsv(columns:string[],records:Record<string,unknown>[]){return [columns.map(csvCell).join(","),...records.map(row=>columns.map(c=>csvCell(row[c])).join(","))].join("\r\n");}

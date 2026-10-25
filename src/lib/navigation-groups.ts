export type NavigationItem={href:string;label:string};
export function navigationGroups(items:NavigationItem[]) {
 const definitions=[
  {id:"learning",label:"My learning",paths:["/catalogue","/catalogue?view=my-learning"]},
  {id:"publication",label:"Course publication",paths:["/admin/courses","/course-reviews","/admin/agreements","/admin/service-costs"]},
  {id:"companies",label:"Companies and branding",paths:["/company","/admin/companies","/admin/certificates"]},
  {id:"enrolment",label:"Learners and payments",paths:["/admin/learners","/admin/invitations","/admin/enrolments","/admin/assessments","/payments","/admin/payments/stripe","/admin/payments"]},
  {id:"governance",label:"Policies and administration",paths:["/admin","/policies","/admin/policies"]},
  {id:"messages",label:"Messages and support",paths:["/messages","/messages/email-management","/messages/email-sets","/messages/image-library","/admin/notifications","/admin/test-messages","/admin/email-templates"]}
 ];
 const extra=items.filter(i=>!['/dashboard','/profile'].includes(i.href)&&!definitions.some(g=>g.paths.includes(i.href)));
 return [...definitions.map(g=>({...g,items:g.paths.flatMap(path=>items.filter(i=>i.href===path))})),{id:"other",label:"Other pages",paths:extra.map(i=>i.href),items:extra}].filter(g=>g.items.length);
}
export function currentNavigation(items:NavigationItem[],pathname:string,view:string|null) {
 return pathname==="/catalogue"?(view==="my-learning"?"/catalogue?view=my-learning":"/catalogue"):
  items.filter(i=>!i.href.includes("?")&&(pathname===i.href||(i.href!=="/admin"&&pathname.startsWith(i.href+"/")))).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
}

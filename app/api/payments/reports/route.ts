import {paymentReport} from "@/server/services/payment-reports";
import {paymentCsv} from "@/lib/payment-reports";
export const maxDuration=300;
export async function GET(request:Request){
 try{
  const params=new URL(request.url).searchParams,input=Object.fromEntries(["scope","table","page","from","to"].map(k=>[k,params.get(k)??undefined]));
  const full=params.get("download")==="all";if(full)input.page="1";
  let report=await paymentReport(input);const columns=report.columns,records=[...report.records];
  while(full&&report.hasMore&&records.length<5000){report=await paymentReport({...input,page:String(report.page+1)});records.push(...report.records);}
  if(full&&report.hasMore)return Response.json({error:"This report exceeds 5,000 records. Narrow the date range or download individual report pages."},{status:413,headers:{"cache-control":"private, no-store"}});
  return new Response("\uFEFF"+paymentCsv(columns,records),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="apgi-${report.table}-${full?"filtered-report":`page-${report.page}`}.csv"`,"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
 }catch{return Response.json({error:"This payment report is unavailable to your account."},{status:403,headers:{"cache-control":"private, no-store"}});}
}

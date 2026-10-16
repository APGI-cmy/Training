import "server-only";
import { adminRest } from "@/server/supabase/admin-rest";
import { assertStagingIsolation } from "@/server/environment-isolation";
import { validateRateValues, type RateCatalogue } from "@/lib/service-rate-register";

export async function currentRateCatalogue():Promise<RateCatalogue> {
  assertStagingIsolation();
  const response=await adminRest("/rest/v1/service_rate_catalogues?select=version,checked_on,rate_values&order=created_at.desc,version.desc&limit=1");
  if(!response.ok)throw Error("The service cost register is temporarily unavailable. Your course inputs are retained; please retry.");
  const [record]=await response.json();
  if(!record||typeof record.version!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(record.checked_on))throw Error("The service cost register needs review.");
  return {version:record.version,checkedOn:record.checked_on,values:validateRateValues(record.rate_values)};
}

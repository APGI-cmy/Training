"use server";
import { revalidatePath } from "next/cache";
import { requirePlatformPrincipal } from "@/server/services/platform-principals";
import { adminRest } from "@/server/supabase/admin-rest";
import { rateDefinitions, validateRateValues } from "@/lib/service-rate-register";
import { checkServiceRateSources } from "@/server/services/check-service-rate-sources";
import type { StructureState } from "@/lib/company-structure";
import { assertStagingIsolation } from "@/server/environment-isolation";

export async function reviewServiceRates(_state:StructureState,form:FormData):Promise<StructureState> {
  try {
    assertStagingIsolation();
    const {session}=await requirePlatformPrincipal();
    if(form.get("reviewed")!=="on")throw Error("Confirm the prices, currency, units and included allowances against the official sources.");
    const values=validateRateValues(Object.fromEntries(rateDefinitions.map(d=>[d.key,form.get(d.key)])));
    const note=String(form.get("review_note")??"").trim(),expected=String(form.get("version")??"");
    if(note.length<10||note.length>2000||expected.length>100)throw Error("Add a review note with the dated pricing or invoice evidence (10–2,000 characters).");
    const response=await adminRest("/rest/v1/rpc/v2_publish_service_rates",{method:"POST",body:JSON.stringify({p_actor:session.user.id,p_expected:expected,p_values:values,p_note:note})});
    if(!response.ok)throw Error("The rate table could not be updated. Another review may have changed it; reload and check before retrying.");
    revalidatePath("/admin/service-costs");revalidatePath("/admin/agreements");revalidatePath("/admin/courses/[courseSlug]/publish","page");
    return {success:"Reviewed rates saved as a new version. New course calculations use these rates; existing saved drafts remain fixed."};
  }catch(e){return {error:e instanceof Error?e.message:"The rates could not be saved."};}
}
export async function checkServiceSources(_state:StructureState):Promise<StructureState> {
  try {
    await requirePlatformPrincipal();
    const results=await checkServiceRateSources();revalidatePath("/admin/service-costs");
    return {success:`Checked ${results.length} official sources. Review the results below; this has not changed any rates.`};
  }catch{return {error:"Source checks could not be completed. The reviewed rates are unchanged; please retry."};}
}

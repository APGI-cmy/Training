export function backupEmailConfiguration(env:Record<string,string|undefined>=process.env){
 if(env.ALP_ENVIRONMENT!=='training-production'||env.ALP_EMAIL_BACKUP_MODE!=='apgi')return null;
 const organisationId=env.ALP_EMAIL_BACKUP_ORGANISATION_ID;
 const raw=env.EMAIL_FROM?.trim()??'',from=raw.match(/<([^<>]+)>$/)?.[1]??raw;
 if(!organisationId||organisationId!==env.ALP_DEFAULT_ORGANISATION_ID||!/^[-0-9a-f]{36}$/i.test(organisationId)||!/^[-a-z0-9._+]+@apginc\.ca$/i.test(from))return null;
 return {organisationId,from};
}
export function backupEmailNotice(brand:string){
 return `${brand} is temporarily using a backup delivery service for automated emails until its dedicated email service is available. Please refer to the training platform’s privacy policy for how your information is handled.`;
}

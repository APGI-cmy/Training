import {backupEmailConfiguration} from '../lib/backup-email.ts';
export const PRODUCTION_PROJECT_ID='prj_BxMjzI1TwimFM2mbV2ox3d7EUTsz';
export const PRODUCTION_DATABASE_REF='rbfzsttqbaocokzbvpbf';
export const PRODUCTION_ORIGIN='https://training.nkscapital.co.za';
export const PRODUCTION_VERCEL_ORIGIN='https://nks-capital-training.vercel.app';
export function productionAppOrigin(env:Record<string,string|undefined>=process.env){
 const origin=env.NEXT_PUBLIC_APP_URL;
 if(origin!==PRODUCTION_ORIGIN&&origin!==PRODUCTION_VERCEL_ORIGIN)throw Error('PRODUCTION_ISOLATION_BLOCKED: wrong canonical production origin');
 return origin;
}
export function assertProductionEnvironment(env:Record<string,string|undefined>){
 const fail=(m:string):never=>{throw Error('PRODUCTION_ISOLATION_BLOCKED: '+m);};
 if(env.ALP_ENVIRONMENT!=='training-production')fail('explicit production environment required');
 if(env.VERCEL&&env.VERCEL_PROJECT_ID!==PRODUCTION_PROJECT_ID)fail('wrong production project');
 if(env.ALP_PRODUCTION_DATABASE_REF!==PRODUCTION_DATABASE_REF)fail('wrong production database identity');
 for(const key of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_URL']){if(key==='SUPABASE_URL'&&!env[key])continue;if(env[key]?.replace(/\/$/,'')!==`https://${PRODUCTION_DATABASE_REF}.supabase.co`)fail('wrong production database endpoint');}
 for(const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']){const value=env[key]??'';if(!value||value==='[SENSITIVE]')fail('production credentials required');if(value.startsWith('eyJ')){try{if(JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString()).ref!==PRODUCTION_DATABASE_REF)fail('wrong credential project');}catch{fail('invalid production credential');}}}
 productionAppOrigin(env);
 if(env.ALP_PAYMENTS_MODE!=='disabled'||env.SCANNEX_VIEWER_LAB_ENABLED!=='false')fail('payments and Viewer must remain disabled');
 if(!['disabled','transactional'].includes(env.ALP_EMAIL_MODE??''))fail('explicit mail mode required');
 const backup=backupEmailConfiguration(env);
 if(env.ALP_EMAIL_BACKUP_MODE&&env.ALP_EMAIL_BACKUP_MODE!=='disabled'&&!backup)fail('invalid backup sender or company binding');
 if(env.ALP_EMAIL_MODE==='transactional'&&(!env.RESEND_API_KEY?.startsWith('re_')||(!backup&&!/^(?:[^<>\r\n]+\s*<)?[^\s<>@]+@nkscapital\.co\.za>?$/i.test(env.EMAIL_FROM??''))))fail('verified company sender or authorised backup configuration required');
 for(const key of ['STAGING_RESEND_API_KEY','STAGING_EMAIL_FROM','SUPABASE_SECRET_KEY','SUPABASE_JWT_SECRET','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','AWS_ROLE_ARN','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_SESSION_TOKEN','SCANNEX_VIEWER_LAB_FLEET_NAME','SCANNEX_VIEWER_LAB_STACK_NAME','AIMC_GATEWAY_API_KEY','AIMC_GATEWAY_URL'])if(env[key]?.trim())fail('unapproved integration '+key);
}

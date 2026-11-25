import {PLATFORM_RELEASE,platformSourceCommit} from '@/lib/platform-release';
import {adminRest} from '@/server/supabase/admin-rest';
export const dynamic='force-dynamic';
export async function GET(){
 let schemaReady=false;
 try{const [identity,columns,sequences]=await Promise.all([adminRest('/rest/v1/platform_deployment_identity?select=project_id&limit=1'),adminRest('/rest/v1/course_distribution?select=id,source_revision,source_key,margin_retained_bps&limit=0'),adminRest('/rest/v1/training_sequence_progress?select=user_id,document_path,through_step&limit=0')]);schemaReady=identity.ok&&columns.ok&&sequences.ok&&(await identity.json())[0]?.project_id===process.env.VERCEL_PROJECT_ID;}catch{/* Readiness failure is explicit and never reports a false healthy deployment. */}
 return Response.json({version:PLATFORM_RELEASE.version,schema:PLATFORM_RELEASE.schema,schemaReady,paymentsDisabled:process.env.ALP_PAYMENTS_MODE==='disabled',source:platformSourceCommit()},{status:schemaReady?200:503,headers:{'cache-control':'no-store'}});
}

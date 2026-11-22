import "server-only";
import { adminRest } from "@/server/supabase/admin-rest";
import type { ProgressEvidence, ProgressRecord, SequenceRecord, TigerRecord } from "@/lib/learning-progress-display";

/** Internal server read; callers must authenticate and supply only their authorised users. */
async function readRows<T>(table: string, select: string, userIds: string[]) {
  const result: T[] = [];
  const order = table === "training_sequence_progress" ? "user_id,course_id,unit_id,edition_key,document_path" : table === "tiger_unit_progress" ? "user_id,course_id,unit_id,edition_key,policy_version" : "user_id,course_id,unit_id";
  for (let offset = 0; offset < 100000; offset += 1000) {
    const response = await adminRest(`/rest/v1/${table}?user_id=in.(${userIds.join(",")})&select=${select}&order=${order}`, {headers: {Range: `${offset}-${offset+999}`}});
    if (!response.ok) return { rows: [] as T[], ok: false };
    const page: T[] = await response.json();
    if (!Array.isArray(page)) return { rows: [] as T[], ok: false };
    result.push(...page);
    if (page.length < 1000) return { rows: result, ok: true };
  }
  return { rows: [] as T[], ok: false };
}

export async function loadProgressDisplayEvidence(userIds: string[]): Promise<ProgressEvidence> {
  if (!userIds.length) return {learning: [], scorm: [], tiger: [], sequence: [], available: true, detailedAvailable: true};
  const [learning, scorm, tiger, sequence] = await Promise.all([
    readRows<ProgressRecord>("learner_progress", "user_id,course_id,unit_id,status,updated_at", userIds),
    readRows<ProgressRecord>("scorm_attempts", "user_id,course_id,unit_id,completion_status,success_status,progress_measure,score_raw,score_max,score_scaled,updated_at", userIds),
    readRows<TigerRecord>("tiger_unit_progress", "user_id,course_id,unit_id,edition_key,policy_version,video_ranges,summaries,quiz_passed,qualified_at,legacy_credit,updated_at", userIds),
    readRows<SequenceRecord>("training_sequence_progress", "user_id,course_id,unit_id,edition_key,begun,step_count,through_step,summary_opened,updated_at", userIds)
  ]);
  return {learning: learning.rows, scorm: scorm.rows, tiger: tiger.rows, sequence: sequence.rows,
    available: learning.ok && scorm.ok, detailedAvailable: tiger.ok && sequence.ok};
}


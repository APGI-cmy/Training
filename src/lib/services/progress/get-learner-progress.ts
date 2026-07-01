import { getSupabaseRestUrl } from "@/server/auth/session";

export type LearnerProgressStatus = "opened" | "completed";

export interface LearnerProgressRow {
  course_id: string;
  unit_id: string;
  status: LearnerProgressStatus;
  first_opened_at?: string | null;
  completed_at?: string | null;
}

export interface LearnerProgressSnapshot {
  rows: LearnerProgressRow[];
  openedUnitIds: Set<string>;
  completedUnitIds: Set<string>;
}

function progressHeaders(accessToken: string) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    return null;
  }

  return {
    apikey: anonKey,
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json"
  };
}

export function emptyProgressSnapshot(): LearnerProgressSnapshot {
  return {
    rows: [],
    openedUnitIds: new Set<string>(),
    completedUnitIds: new Set<string>()
  };
}

export async function getLearnerProgress({
  accessToken,
  userId,
  courseId
}: {
  accessToken: string;
  userId: string;
  courseId: string;
}): Promise<LearnerProgressSnapshot> {
  const headers = progressHeaders(accessToken);
  const url = getSupabaseRestUrl(
    `/rest/v1/learner_progress?select=course_id,unit_id,status,first_opened_at,completed_at&user_id=eq.${userId}&course_id=eq.${courseId}`
  );

  if (!headers || !url) {
    return emptyProgressSnapshot();
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    return emptyProgressSnapshot();
  }

  const rows = (await response.json().catch(() => [])) as LearnerProgressRow[];
  const openedUnitIds = new Set<string>();
  const completedUnitIds = new Set<string>();

  for (const row of rows) {
    if (row.status === "opened" || row.status === "completed") {
      openedUnitIds.add(row.unit_id);
    }

    if (row.status === "completed") {
      completedUnitIds.add(row.unit_id);
    }
  }

  return {
    rows,
    openedUnitIds,
    completedUnitIds
  };
}
